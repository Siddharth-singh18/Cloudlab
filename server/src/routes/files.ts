import { Router, Response } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { requireProjectAccess } from '../lib/projectAccess'

const router = Router()
const prisma = new PrismaClient()

async function resolveProjectPath(projectId: string, userId: string): Promise<string> {
  const access = await requireProjectAccess(prisma, projectId, userId, 'canRead')
  return access.project.storagePath
}

async function buildFileTree(dirPath: string, projectId: string, relativePath = ''): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue

    const fullPath = path.join(dirPath, entry.name)
    const relPath  = relativePath ? `${relativePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, projectId, relPath)
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'folder',
        projectId,
        children,
      })
    } else {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'file',
        projectId,
      })
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function makeDuplicatePath(originalPath: string) {
  const lastSlash = originalPath.lastIndexOf('/')
  const parent = lastSlash >= 0 ? originalPath.slice(0, lastSlash) : ''
  const name = lastSlash >= 0 ? originalPath.slice(lastSlash + 1) : originalPath
  const dotIndex = name.lastIndexOf('.')
  const hasExtension = dotIndex > 0
  const baseName = hasExtension ? name.slice(0, dotIndex) : name
  const ext = hasExtension ? name.slice(dotIndex) : ''
  const duplicateName = `${baseName}-copy${ext}`
  return parent ? `${parent}/${duplicateName}` : duplicateName
}

// GET /api/projects/:id/files  — returns tree
router.get('/:id/files', requireAuth, async (req: AuthRequest, res: Response) => {
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const tree = await buildFileTree(storagePath, req.params.id)
  return res.json(tree)
})

// GET /api/projects/:id/files/content?path=src/App.tsx
router.get('/:id/files/content', requireAuth, async (req: AuthRequest, res: Response) => {
  const filePath = req.query.path as string
  if (!filePath) return res.status(400).json({ error: 'path query required' })

  // Security: prevent path traversal
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const absPath = path.resolve(storagePath, filePath)
  if (!absPath.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  try {
    const content = await fs.readFile(absPath, 'utf-8')
    return res.json({ path: filePath, content })
  } catch {
    throw new AppError('File not found', 404)
  }
})

// PUT /api/projects/:id/files/content  — save file
router.put('/:id/files/content', requireAuth, async (req: AuthRequest, res: Response) => {
  const { path: filePath, content } = req.body
  if (!filePath) return res.status(400).json({ error: 'path required' })

  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const absPath = path.resolve(storagePath, filePath)
  if (!absPath.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  // Ensure parent dirs exist
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  await fs.writeFile(absPath, content, 'utf-8')

  // Update project timestamp
  await prisma.project.update({
    where: { id: req.params.id },
    data: { updatedAt: new Date() },
  })

  // Emit save event via Socket.IO
  const io = (req as any).io
  io?.to(`project:${req.params.id}`).emit('file:saved', {
    path: filePath,
    savedBy: req.user!.userId,
  })

  return res.json({ ok: true, path: filePath })
})

// POST /api/projects/:id/files  — create file or folder
router.post('/:id/files', requireAuth, async (req: AuthRequest, res: Response) => {
  const { path: filePath, type } = req.body
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const absPath = path.resolve(storagePath, filePath)
  if (!absPath.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  if (type === 'folder') {
    await fs.mkdir(absPath, { recursive: true })
  } else {
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, '', 'utf-8')
  }

  return res.status(201).json({ ok: true, path: filePath, type })
})

// DELETE /api/projects/:id/files?path=src/old.ts
router.delete('/:id/files', requireAuth, async (req: AuthRequest, res: Response) => {
  const filePath = req.query.path as string
  if (!filePath) return res.status(400).json({ error: 'path required' })

  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const absPath = path.resolve(storagePath, filePath)
  if (!absPath.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  await fs.rm(absPath, { recursive: true, force: true })
  return res.json({ ok: true })
})

// PATCH /api/projects/:id/files  — rename
router.patch('/:id/files', requireAuth, async (req: AuthRequest, res: Response) => {
  const { oldPath, newPath } = req.body
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)

  const absOld = path.resolve(storagePath, oldPath)
  const absNew = path.resolve(storagePath, newPath)

  if (!absOld.startsWith(path.resolve(storagePath)) || !absNew.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  await fs.rename(absOld, absNew)
  return res.json({ ok: true, oldPath, newPath })
})

// POST /api/projects/:id/files/duplicate
router.post('/:id/files/duplicate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { sourcePath, targetPath } = req.body
  if (!sourcePath) return res.status(400).json({ error: 'sourcePath required' })

  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const storagePath = await resolveProjectPath(req.params.id, req.user!.userId)
  const resolvedSource = path.resolve(storagePath, sourcePath)
  const resolvedTarget = path.resolve(storagePath, targetPath || makeDuplicatePath(sourcePath))

  if (!resolvedSource.startsWith(path.resolve(storagePath)) || !resolvedTarget.startsWith(path.resolve(storagePath))) {
    throw new AppError('Path traversal denied', 403)
  }

  const stats = await fs.stat(resolvedSource).catch(() => null)
  if (!stats) throw new AppError('Source path not found', 404)

  await fs.mkdir(path.dirname(resolvedTarget), { recursive: true })
  if (stats.isDirectory()) {
    await fs.cp(resolvedSource, resolvedTarget, { recursive: true, force: true })
  } else {
    await fs.copyFile(resolvedSource, resolvedTarget)
  }

  return res.status(201).json({ ok: true, sourcePath, targetPath: path.relative(storagePath, resolvedTarget) })
})

export { router as filesRouter }
