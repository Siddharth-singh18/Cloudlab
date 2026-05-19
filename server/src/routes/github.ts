import { Router, Response } from 'express'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import simpleGit from 'simple-git'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { requireProjectAccess } from '../lib/projectAccess'

const router = Router()
const prisma = new PrismaClient()

function normalizeRepoUrl(input: string) {
  let repoUrl = input.trim()
  if (!repoUrl) throw new AppError('GitHub repository URL is required', 400)
  if (!/^https?:\/\//i.test(repoUrl)) repoUrl = `https://${repoUrl}`
  if (!/github\.com/i.test(repoUrl)) throw new AppError('Only GitHub repository URLs are supported right now', 400)
  return repoUrl.replace(/\/+$/, '').replace(/\.git$/, '')
}

function withGitHubToken(repoUrl: string, token?: string | null) {
  if (!token) return `${repoUrl}.git`
  const url = new URL(`${repoUrl}.git`)
  url.username = 'x-access-token'
  url.password = token
  return url.toString()
}

function parseGitHubRepo(repoUrl: string) {
  const normalized = normalizeRepoUrl(repoUrl)
  const url = new URL(normalized)
  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean)
  if (parts.length < 2) throw new AppError('Invalid GitHub repository URL', 400)
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ''),
    normalizedUrl: normalized,
  }
}

function sanitizeBranchName(input?: string | null) {
  const cleaned = (input || 'workspace-update')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return cleaned || 'workspace-update'
}

async function emptyDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
  const entries = await fs.readdir(dirPath)
  await Promise.all(entries.map((entry) => fs.rm(path.join(dirPath, entry), { recursive: true, force: true })))
}

async function copyDirectory(sourcePath: string, targetPath: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.cp(sourcePath, targetPath, { recursive: true, force: true })
}

async function getStoredGitHubToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubToken: true },
  })
  return user?.githubToken || null
}

async function persistGitHubToken(userId: string, token?: string) {
  if (!token?.trim()) return
  await prisma.user.update({
    where: { id: userId },
    data: { githubToken: token.trim() },
  }).catch(() => null)
}

async function ensureRepo(projectId: string, userId: string) {
  const access = await requireProjectAccess(prisma, projectId, userId, 'canWrite')
  const cwd = path.resolve(access.project.storagePath)
  const git = simpleGit(cwd)
  const isRepo = await git.checkIsRepo().catch(() => false)

  if (!isRepo) {
    await git.init()
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  await git.addConfig('user.name', user?.name || 'CloudLab')
  await git.addConfig('user.email', user?.email || 'cloudlab@localhost')

  return { git, project: access.project, cwd }
}

async function getDefaultBaseBranch(git: ReturnType<typeof simpleGit>) {
  const branches = await git.branch(['-a']).catch(() => ({ all: [] as string[] }))
  if (branches.all.includes('main') || branches.all.includes('remotes/origin/main')) return 'main'
  if (branches.all.includes('master') || branches.all.includes('remotes/origin/master')) return 'master'
  return 'main'
}

async function createGitHubPullRequest(params: {
  repoUrl: string
  token: string
  headBranch: string
  baseBranch: string
  title: string
  body: string
}) {
  const { owner, repo } = parseGitHubRepo(params.repoUrl)
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CloudLab',
    },
    body: JSON.stringify({
      title: params.title,
      head: params.headBranch,
      base: params.baseBranch,
      body: params.body,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new AppError(`GitHub PR creation failed: ${errorText || response.statusText}`, 502)
  }

  return response.json() as Promise<{ html_url: string }>
}

async function fetchGitHubUser(token: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CloudLab',
    },
  })

  if (!response.ok) return null
  return response.json() as Promise<{ login: string; name?: string; avatar_url?: string }>
}

function buildSmartPrSummary(params: {
  branchLabel: string
  status: Awaited<ReturnType<ReturnType<typeof simpleGit>['status']>>
  diffSummary: Awaited<ReturnType<ReturnType<typeof simpleGit>['diffSummary']>>
  commitMessage: string
}) {
  const changedFiles = [
    ...params.status.modified,
    ...params.status.created,
    ...params.status.deleted,
    ...params.status.not_added,
    ...params.status.renamed.map((entry) => entry.to)
  ]
  const uniqueFiles = Array.from(new Set(changedFiles)).slice(0, 8)
  const diffFileCount = Array.isArray(params.diffSummary.files) ? params.diffSummary.files.length : 0
  const fileSummary = uniqueFiles.length
    ? uniqueFiles.map((file) => `- ${file}`).join('\n')
    : '- Workspace updates'

  const title =
    `CloudLab: ${params.branchLabel} (${Math.max(diffFileCount, uniqueFiles.length)} files changed)`

  const body = [
    'Changes pushed from CloudLab.',
    '',
    `Commit message: ${params.commitMessage}`,
    '',
    `Files changed: ${Math.max(diffFileCount, uniqueFiles.length)}`,
    `Insertions: ${params.diffSummary.insertions}`,
    `Deletions: ${params.diffSummary.deletions}`,
    '',
    'Touched files:',
    fileSummary,
  ].join('\n')

  return { title, body }
}

router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const token = await getStoredGitHubToken(req.user!.userId)
  if (!token) {
    return res.json({ connected: false, account: null })
  }

  const account = await fetchGitHubUser(token)
  if (!account) {
    return res.json({ connected: false, account: null })
  }

  return res.json({
    connected: true,
    account: {
      login: account.login,
      name: account.name || account.login,
      avatarUrl: account.avatar_url || null,
    },
  })
})

router.post('/branches', requireAuth, async (req: AuthRequest, res: Response) => {
  const { githubUrl, githubToken } = req.body as { githubUrl?: string; githubToken?: string }
  if (!githubUrl) throw new AppError('githubUrl is required', 400)

  const token = githubToken?.trim() || (await getStoredGitHubToken(req.user!.userId))
  await persistGitHubToken(req.user!.userId, githubToken)

  const { owner, repo } = parseGitHubRepo(githubUrl)
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CloudLab',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new AppError(`Could not load branches: ${errorText || response.statusText}`, 502)
  }

  const branches = (await response.json()) as Array<{ name: string }>
  return res.json(branches.map((branch) => branch.name))
})

router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const projectId = req.query.projectId as string | undefined
  if (!projectId) throw new AppError('projectId is required', 400)

  await requireProjectAccess(prisma, projectId, req.user!.userId, 'canRead')
  const events = await prisma.activityEvent.findMany({
    where: {
      projectId,
      description: { contains: 'GitHub' },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return res.json(events)
})

router.get('/repos', requireAuth, async (req: AuthRequest, res: Response) => {
  const token = await getStoredGitHubToken(req.user!.userId)
  if (!token) return res.json([])

  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CloudLab',
    },
  })

  if (!response.ok) {
    return res.json([])
  }

  const repos = (await response.json()) as Array<{
    id: number
    full_name: string
    html_url: string
    private: boolean
    default_branch: string
  }>
  return res.json(
    repos.map((repo: any) => ({
      id: repo.id,
      name: repo.full_name,
      url: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch,
    }))
  )
})

router.post('/import', requireAuth, async (req: AuthRequest, res: Response) => {
  const { projectId, githubUrl, branch, githubToken } = req.body as {
    projectId?: string
    githubUrl?: string
    branch?: string
    githubToken?: string
  }

  if (!projectId) throw new AppError('projectId is required', 400)
  if (!githubUrl) throw new AppError('githubUrl is required', 400)

  const token = githubToken?.trim() || (await getStoredGitHubToken(req.user!.userId))
  await persistGitHubToken(req.user!.userId, githubToken)

  const access = await requireProjectAccess(prisma, projectId, req.user!.userId, 'canWrite')
  const repoUrl = normalizeRepoUrl(githubUrl)
  const authedRepoUrl = withGitHubToken(repoUrl, token)
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudlab-import-'))
  const branchName = branch?.trim() || 'main'
  const git = simpleGit()

  try {
    await git.clone(authedRepoUrl, tempDir, ['--branch', branchName, '--single-branch'])
    await emptyDirectory(access.project.storagePath)
    await copyDirectory(tempDir, access.project.storagePath)

    const importedGit = simpleGit(access.project.storagePath)
    await importedGit.remote(['set-url', 'origin', authedRepoUrl]).catch(async () => {
      await importedGit.addRemote('origin', authedRepoUrl)
    })

    await prisma.activityEvent.create({
      data: {
        type: 'EDIT',
        userId: req.user!.userId,
        projectId,
        description: `GitHub import completed from ${repoUrl} (${branchName})`,
      },
    }).catch(() => null)

    return res.json({
      ok: true,
      repoUrl,
      branch: branchName,
      message: 'Repository imported successfully.',
    })
  } catch (error: any) {
    throw new AppError(error?.message || 'GitHub import failed', 500)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null)
  }
})

router.post('/push', requireAuth, async (req: AuthRequest, res: Response) => {
  const {
    projectId,
    branchName,
    commitMessage,
    githubUrl,
    githubToken,
    baseBranch,
  } = req.body as {
    projectId?: string
    branchName?: string
    commitMessage?: string
    githubUrl?: string
    githubToken?: string
    baseBranch?: string
  }

  if (!projectId) throw new AppError('projectId is required', 400)

  const { git } = await ensureRepo(projectId, req.user!.userId)
  const token = githubToken?.trim() || (await getStoredGitHubToken(req.user!.userId))
  await persistGitHubToken(req.user!.userId, githubToken)

  const remotes = await git.getRemotes(true)
  const existingOrigin = remotes.find((remote) => remote.name === 'origin')?.refs.push
  const repoUrl = githubUrl?.trim() || existingOrigin?.replace(/\.git$/, '')
  if (!repoUrl) {
    throw new AppError('GitHub repository URL is required before pushing', 400)
  }
  if (!token) {
    throw new AppError('GitHub token is required for push and PR creation', 400)
  }

  const normalizedRepoUrl = normalizeRepoUrl(repoUrl)
  const authedRepoUrl = withGitHubToken(normalizedRepoUrl, token)
  const cloudlabBranch = `cloudlab/${sanitizeBranchName(branchName)}-${Date.now()}`

  await git.remote(['set-url', 'origin', authedRepoUrl]).catch(async () => {
    await git.addRemote('origin', authedRepoUrl)
  })

  await git.fetch('origin').catch(() => null)
  await git.checkoutLocalBranch(cloudlabBranch)
  await git.add('.')

  const status = await git.status()
  const hasChanges =
    status.files.length > 0 ||
    status.created.length > 0 ||
    status.modified.length > 0 ||
    status.deleted.length > 0 ||
    status.not_added.length > 0

  if (!hasChanges) {
    throw new AppError('No local changes to push', 400)
  }

  const finalCommitMessage =
    commitMessage?.trim() || `chore: sync workspace changes from CloudLab`

  const diffSummary = await git.diffSummary(['--cached']).catch(async () => git.diffSummary())
  await git.commit(finalCommitMessage)
  await git.push(['-u', 'origin', cloudlabBranch])

  const targetBaseBranch = baseBranch?.trim() || (await getDefaultBaseBranch(git))
  const branchLabel = sanitizeBranchName(branchName || 'workspace-update')
  const prSummary = buildSmartPrSummary({
    branchLabel,
    status,
    diffSummary,
    commitMessage: finalCommitMessage,
  })
  const pullRequest = await createGitHubPullRequest({
    repoUrl: normalizedRepoUrl,
    token,
    headBranch: cloudlabBranch,
    baseBranch: targetBaseBranch,
    title: prSummary.title,
    body: prSummary.body,
  })

  await prisma.activityEvent.create({
    data: {
      type: 'EDIT',
      userId: req.user!.userId,
      projectId,
      description: `GitHub push created ${cloudlabBranch} and PR to ${targetBaseBranch}`,
    },
  }).catch(() => null)

  return res.json({
    ok: true,
    branch: cloudlabBranch,
    baseBranch: targetBaseBranch,
    prUrl: pullRequest.html_url,
    repoUrl: normalizedRepoUrl,
  })
})

export { router as githubRouter }
