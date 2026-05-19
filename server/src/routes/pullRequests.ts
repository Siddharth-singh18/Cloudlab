import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { getProjectAccess, requireProjectAccess } from '../lib/projectAccess'
import { createProjectCheckpoint } from '../lib/versioning'

const router = Router()
const prisma = new PrismaClient()
const db = prisma as any

router.get('/:id/pull-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canRead')
  if (!db.pRRequest) return res.json([])

  const pullRequests = await db.pRRequest.findMany({
    where: {
      OR: [{ targetProjectId: req.params.id }, { sourceProjectId: req.params.id }],
    },
    include: {
      raisedBy: { select: { id: true, name: true, avatar: true, color: true } },
      sourceProject: { select: { id: true, name: true } },
      targetProject: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json(pullRequests)
})

router.post('/:id/pull-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!db.pRRequest) throw new AppError('CloudLab PRs are not available until the database schema is updated.', 503)

  const sourceAccess = await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const schema = z.object({
    targetProjectId: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const targetAccess = await getProjectAccess(prisma, parsed.data.targetProjectId, req.user!.userId)
  if (!targetAccess.canRead) throw new AppError('Target project not found', 404)

  const pullRequest = await db.pRRequest.create({
    data: {
      sourceProjectId: req.params.id,
      targetProjectId: parsed.data.targetProjectId,
      raisedById: req.user!.userId,
      title: parsed.data.title,
      description: parsed.data.description,
    },
    include: {
      raisedBy: { select: { id: true, name: true, avatar: true, color: true } },
      sourceProject: { select: { id: true, name: true } },
      targetProject: { select: { id: true, name: true } },
    },
  })

  return res.status(201).json(pullRequest)
})

router.patch('/pull-requests/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!db.pRRequest) throw new AppError('CloudLab PRs are not available until the database schema is updated.', 503)

  const schema = z.object({
    status: z.enum(['OPEN', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']),
    note: z.string().max(5000).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const pullRequest = await db.pRRequest.findUnique({
    where: { id: req.params.id },
    include: {
      sourceProject: { select: { id: true, name: true } },
      targetProject: { select: { id: true, name: true } },
      raisedBy: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })
  if (!pullRequest) throw new AppError('Pull request not found', 404)
  if (pullRequest.status === 'MERGED') throw new AppError('Merged pull requests cannot be changed', 400)

  const capability = parsed.data.status === 'APPROVED' ? 'canMerge' : 'canReview'
  await requireProjectAccess(prisma, pullRequest.targetProjectId, req.user!.userId, capability)

  const updated = await db.pRRequest.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === 'OPEN' ? null : new Date(),
    },
    include: {
      raisedBy: { select: { id: true, name: true, avatar: true, color: true } },
      sourceProject: { select: { id: true, name: true } },
      targetProject: { select: { id: true, name: true } },
    },
  })

  return res.json(updated)
})

router.post('/pull-requests/:id/merge', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!db.pRRequest) throw new AppError('CloudLab PRs are not available until the database schema is updated.', 503)

  const pullRequest = await db.pRRequest.findUnique({
    where: { id: req.params.id },
    include: {
      sourceProject: true,
      targetProject: true,
      raisedBy: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })
  if (!pullRequest) throw new AppError('Pull request not found', 404)
  if (pullRequest.status !== 'OPEN' && pullRequest.status !== 'APPROVED') {
    throw new AppError('Pull request is not mergeable', 400)
  }

  await requireProjectAccess(prisma, pullRequest.targetProjectId, req.user!.userId, 'canMerge')
  await createProjectCheckpoint(
    prisma,
    pullRequest.targetProjectId,
    req.user!.userId,
    `Safety checkpoint before merging PR "${pullRequest.title}"`,
    false
  )

  const updated = await db.pRRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'MERGED',
      resolvedAt: new Date(),
    },
  })

  await prisma.activityEvent.create({
    data: {
      type: 'MERGE',
      userId: req.user!.userId,
      projectId: pullRequest.targetProjectId,
      description: `merged CloudLab PR: ${pullRequest.title}`,
    },
  })

  return res.json(updated)
})

export { router as pullRequestsRouter }
