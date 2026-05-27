import { Router, Response } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { getProjectAccess } from '../lib/projectAccess'

const router = Router()
const prisma = new PrismaClient()
const STORAGE_ROOT = process.env.STORAGE_LOCAL_PATH || './storage/projects'

async function copyWorkspace(sourcePath: string, targetPath: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (entry) => !entry.includes(`${path.sep}node_modules${path.sep}`),
  })
}

// GET /api/projects
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: req.user!.userId },
        { collaborators: { some: { userId: req.user!.userId } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      collaborators: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      _count: { select: { reviewSessions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return res.json(
    projects.map((project) => {
      const collaborator = project.collaborators.find(
        (entry) => entry.userId === req.user!.userId
      )
      const currentUserRole =
        project.ownerId === req.user!.userId ? 'OWNER' : collaborator?.role ?? null

      return {
        ...project,
        currentUserRole,
        permissions: {
          canRead: true,
          canWrite: currentUserRole === 'OWNER' || currentUserRole === 'EDITOR',
          canReview:
            currentUserRole === 'OWNER' ||
            currentUserRole === 'EDITOR' ||
            currentUserRole === 'REVIEWER',
          canManage: currentUserRole === 'OWNER',
          canMerge: currentUserRole === 'OWNER',
        },
        isExternalClone: false,
      }
    })
  )
})

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const access = await getProjectAccess(prisma, req.params.id, req.user!.userId)
  if (!access.canRead) throw new AppError('Project not found', 404)

  const project = await prisma.project.findFirst({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, avatar: true, color: true } },
      collaborators: {
        include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      },
    },
  })
  if (!project) throw new AppError('Project not found', 404)
  return res.json({
    ...project,
    currentUserRole: access.level === 'public' ? null : access.level,
    permissions: {
      canRead: access.canRead,
      canWrite: access.canWrite,
      canReview: access.canReview,
      canManage: access.canManage,
      canMerge: access.canMerge,
    },
    isExternalClone: false,
  })
})

// POST /api/projects
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name:        z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    language:    z.string().default('Workspace'),
    isPublic:    z.boolean().default(false),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const { name, description, language, isPublic } = parsed.data
  const project = await prisma.project.create({
    data: {
      name, description, language, isPublic,
      ownerId: req.user!.userId,
      storagePath: '',
    },
  })

  const storagePath = path.join(STORAGE_ROOT, req.user!.userId, project.id)
  await fs.mkdir(storagePath, { recursive: true })

  const updatedProject = await prisma.project.update({
    where: { id: project.id },
    data: { storagePath },
  })

  return res.status(201).json({
    ...updatedProject,
    currentUserRole: 'OWNER',
    permissions: {
      canRead: true,
      canWrite: true,
      canReview: true,
      canManage: true,
      canMerge: true,
    },
    isExternalClone: false,
  })
})

// PATCH /api/projects/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.userId },
  })
  if (!project) throw new AppError('Project not found or insufficient permissions', 404)

  const schema = z.object({
    name:        z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isPublic:    z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: parsed.data,
  })
  return res.json(updated)
})

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.userId },
  })
  if (!project) throw new AppError('Project not found', 404)

  // Remove storage
  await fs.rm(project.storagePath, { recursive: true, force: true }).catch(() => {})

  await prisma.project.delete({ where: { id: req.params.id } })
  return res.json({ ok: true })
})

// POST /api/projects/:id/collaborators
router.post('/:id/collaborators', requireAuth, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.userId },
  })
  if (!project) throw new AppError('Not found or not owner', 404)

  const { email, role = 'REVIEWER' } = req.body
  const invitee = await prisma.user.findUnique({ where: { email } })
  if (!invitee) throw new AppError('User not found', 404)

  const collab = await prisma.collaborator.upsert({
    where: { projectId_userId: { projectId: project.id, userId: invitee.id } },
    create: { projectId: project.id, userId: invitee.id, role },
    update: { role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  })
  return res.status(201).json(collab)
})

// GET /api/projects/:id/invite
router.get('/:id/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.userId },
  })
  if (!project) throw new AppError('Not found or not owner', 404)

  if (project.inviteToken) {
    return res.json({ inviteToken: project.inviteToken })
  }

  // Generate new invite token (using uuid or random string)
  const crypto = require('crypto')
  const inviteToken = crypto.randomBytes(16).toString('hex')

  await prisma.project.update({
    where: { id: project.id },
    data: { inviteToken },
  })

  return res.json({ inviteToken })
})

// POST /api/projects/join/:token
router.post('/join/:token', requireAuth, async (req: AuthRequest, res: Response) => {
  const { token } = req.params
  if (!token) throw new AppError('Token is required', 400)

  const project = await prisma.project.findUnique({
    where: { inviteToken: token },
  })

  if (!project) throw new AppError('Invalid or expired invite link', 404)

  // Don't add if they are the owner
  if (project.ownerId === req.user!.userId) {
    return res.json({ projectId: project.id, message: 'You are the owner' })
  }

  // Upsert user as EDITOR
  await prisma.collaborator.upsert({
    where: { projectId_userId: { projectId: project.id, userId: req.user!.userId } },
    create: { projectId: project.id, userId: req.user!.userId, role: 'EDITOR' },
    update: { role: 'EDITOR' },
  })

  return res.status(200).json({ projectId: project.id })
})

// POST /api/projects/:id/clone
router.post('/:id/clone', requireAuth, async (req: AuthRequest, res: Response) => {
  const sourceAccess = await getProjectAccess(prisma, req.params.id, req.user!.userId)
  if (!sourceAccess.canRead || !sourceAccess.project.isPublic) {
    throw new AppError('Only public projects can be cloned into a separate workspace', 403)
  }

  const sourceProject = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, avatar: true, color: true } },
      collaborators: {
        include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      },
    },
  })

  if (!sourceProject) throw new AppError('Project not found', 404)

  const cloneProject = await prisma.project.create({
    data: {
      name: `${sourceProject.name} Copy`,
      description: sourceProject.description,
      language: sourceProject.language,
      isPublic: false,
      ownerId: req.user!.userId,
      storagePath: '',
    },
  })

  const cloneStoragePath = path.join(STORAGE_ROOT, req.user!.userId, cloneProject.id)
  await copyWorkspace(sourceProject.storagePath, cloneStoragePath)

  const updatedClone = await prisma.project.update({
    where: { id: cloneProject.id },
    data: { storagePath: cloneStoragePath },
  })

  return res.status(201).json({
    ...updatedClone,
    sourceProjectId: sourceProject.id,
    currentUserRole: 'OWNER',
    permissions: {
      canRead: true,
      canWrite: true,
      canReview: true,
      canManage: true,
      canMerge: true,
    },
    isExternalClone: true,
  })
})

export { router as projectsRouter }
