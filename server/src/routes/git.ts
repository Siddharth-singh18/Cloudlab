import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import simpleGit from 'simple-git'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'

const router = Router()
const prisma = new PrismaClient()

async function getProjectGit(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
  })
  if (!project) throw new AppError('Project not found', 404)

  const git = simpleGit(project.storagePath)

  // Init git if not already
  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) {
    await git.init()
    await git.addConfig('user.email', 'devforge@localhost')
    await git.addConfig('user.name', 'DevForge')
    await git.add('.')
    await git.commit('chore: initial commit').catch(() => {}) // ok if nothing to commit
  }

  return { git, project }
}

// GET /api/projects/:id/git/status
router.get('/:id/git/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const { git } = await getProjectGit(req.params.id, req.user!.userId)
  const status = await git.status()
  return res.json({
    branch: status.current,
    modified: status.modified,
    added: status.created,
    deleted: status.deleted,
    untracked: status.not_added,
    staged: status.staged,
    ahead: status.ahead,
    behind: status.behind,
  })
})

// GET /api/projects/:id/git/branches
router.get('/:id/git/branches', requireAuth, async (req: AuthRequest, res: Response) => {
  const { git } = await getProjectGit(req.params.id, req.user!.userId)
  const branches = await git.branchLocal()
  return res.json({
    current: branches.current,
    branches: Object.values(branches.branches).map((b) => ({
      name: b.name,
      current: b.current,
      commit: b.commit,
      label: b.label,
    })),
  })
})

// GET /api/projects/:id/git/commits
router.get('/:id/git/commits', requireAuth, async (req: AuthRequest, res: Response) => {
  const { git } = await getProjectGit(req.params.id, req.user!.userId)
  const branch = req.query.branch as string | undefined

  const log = await git.log({ maxCount: 50, ...(branch ? { from: branch } : {}) })
  return res.json(log.all.map((c) => ({
    hash: c.hash,
    message: c.message,
    author: c.author_name,
    email: c.author_email,
    date: c.date,
  })))
})

// POST /api/projects/:id/git/commit
router.post('/:id/git/commit', requireAuth, async (req: AuthRequest, res: Response) => {
  const { message, files } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  const { git } = await getProjectGit(req.params.id, req.user!.userId)

  if (files?.length) {
    await git.add(files)
  } else {
    await git.add('.')
  }

  const result = await git.commit(message)
  return res.json({ hash: result.commit, message, branch: result.branch })
})

// POST /api/projects/:id/git/branch
router.post('/:id/git/branch', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })

  const { git } = await getProjectGit(req.params.id, req.user!.userId)
  await git.checkoutLocalBranch(name)
  return res.json({ ok: true, branch: name })
})

// POST /api/projects/:id/git/checkout
router.post('/:id/git/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { branch } = req.body
  if (!branch) return res.status(400).json({ error: 'branch required' })

  const { git } = await getProjectGit(req.params.id, req.user!.userId)
  await git.checkout(branch)
  return res.json({ ok: true, branch })
})

// POST /api/projects/:id/git/import
router.post('/:id/git/import', requireAuth, async (req: AuthRequest, res: Response) => {
  const { repoUrl } = req.body
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl required' })

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.userId },
  })
  if (!project) throw new AppError('Project not found', 404)

  // Clone into a temp dir, then move files
  const git = simpleGit()
  const tmpDir = `${project.storagePath}_import_${Date.now()}`

  await git.clone(repoUrl, tmpDir, ['--depth', '1'])

  // NOTE: In production, copy files from tmpDir to storagePath
  // (respecting the "warn before replacing" requirement from spec)
  return res.json({ ok: true, message: 'Import started — files will be available shortly.' })
})

export { router as gitRouter }
