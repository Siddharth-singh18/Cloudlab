import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { requireProjectAccess } from '../lib/projectAccess'
import { recalculateProjectFileStatus } from '../lib/projectReviewState'

const router = Router()
const prisma = new PrismaClient()
const db = prisma as any

function ensureProjectReviewModels() {
  if (!db.projectComment || !db.projectSuggestion) {
    throw new AppError('Project review tables are not available until the database schema is updated.', 503)
  }
}

router.get('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canRead')
  if (!db.projectComment) return res.json([])

  const comments = await db.projectComment.findMany({
    where: { projectId: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, avatar: true, color: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ resolved: 'asc' }, { createdAt: 'asc' }],
  })

  return res.json(comments)
})

router.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canReview')

  const schema = z.object({
    filePath: z.string().min(1),
    lineStart: z.number().int().positive(),
    lineEnd: z.number().int().positive(),
    body: z.string().min(1).max(5000),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const comment = await db.projectComment.create({
    data: {
      projectId: req.params.id,
      filePath: parsed.data.filePath,
      lineStart: parsed.data.lineStart,
      lineEnd: parsed.data.lineEnd,
      body: parsed.data.body,
      authorId: req.user!.userId,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  await recalculateProjectFileStatus(prisma, req.params.id, parsed.data.filePath)
  const payload = { ...comment, projectId: req.params.id, replies: [] }
  const io = (req as any).io
  io?.to(`project:${req.params.id}`).emit('project:comment:new', payload)
  return res.status(201).json(payload)
})

router.patch('/comments/:id/resolve', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  const existing = await db.projectComment.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new AppError('Comment not found', 404)
  await requireProjectAccess(prisma, existing.projectId, req.user!.userId, 'canReview')

  const comment = await db.projectComment.update({
    where: { id: req.params.id },
    data: { resolved: true },
  })
  await recalculateProjectFileStatus(prisma, comment.projectId, comment.filePath)

  const io = (req as any).io
  io?.to(`project:${comment.projectId}`).emit('project:comment:resolved', req.params.id)
  return res.json(comment)
})

router.post('/comments/:id/replies', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  const schema = z.object({ body: z.string().min(1).max(5000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const comment = await db.projectComment.findUnique({ where: { id: req.params.id } })
  if (!comment) throw new AppError('Comment not found', 404)
  await requireProjectAccess(prisma, comment.projectId, req.user!.userId, 'canReview')

  const reply = await db.projectCommentReply.create({
    data: {
      commentId: comment.id,
      authorId: req.user!.userId,
      body: parsed.data.body,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  return res.status(201).json(reply)
})

router.get('/:id/suggestions', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canRead')
  if (!db.projectSuggestion) return res.json([])

  const suggestions = await db.projectSuggestion.findMany({
    where: { projectId: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return res.json(suggestions)
})

router.post('/:id/suggestions', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canReview')

  const schema = z.object({
    filePath: z.string().min(1),
    lineStart: z.number().int().positive(),
    lineEnd: z.number().int().positive(),
    originalCode: z.string(),
    suggestedCode: z.string(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const suggestion = await db.projectSuggestion.create({
    data: {
      projectId: req.params.id,
      filePath: parsed.data.filePath,
      lineStart: parsed.data.lineStart,
      lineEnd: parsed.data.lineEnd,
      originalCode: parsed.data.originalCode,
      suggestedCode: parsed.data.suggestedCode,
      authorId: req.user!.userId,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  await recalculateProjectFileStatus(prisma, req.params.id, parsed.data.filePath)
  const io = (req as any).io
  io?.to(`project:${req.params.id}`).emit('project:suggestion:new', { ...suggestion, projectId: req.params.id })
  return res.status(201).json({ ...suggestion, projectId: req.params.id })
})

router.post('/suggestions/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  const existing = await db.projectSuggestion.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new AppError('Suggestion not found', 404)
  await requireProjectAccess(prisma, existing.projectId, req.user!.userId, 'canReview')

  const suggestion = await db.projectSuggestion.update({
    where: { id: req.params.id },
    data: { status: 'ACCEPTED' },
    include: { author: { select: { id: true, name: true, avatar: true, color: true } } },
  })

  await recalculateProjectFileStatus(prisma, suggestion.projectId, suggestion.filePath)
  const io = (req as any).io
  io?.to(`project:${suggestion.projectId}`).emit('project:suggestion:update', {
    ...suggestion,
    status: 'accepted',
    projectId: suggestion.projectId,
  })
  return res.json({ ...suggestion, status: 'accepted', projectId: suggestion.projectId })
})

router.post('/suggestions/:id/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  ensureProjectReviewModels()
  const existing = await db.projectSuggestion.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new AppError('Suggestion not found', 404)
  await requireProjectAccess(prisma, existing.projectId, req.user!.userId, 'canReview')

  const suggestion = await db.projectSuggestion.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED' },
    include: { author: { select: { id: true, name: true, avatar: true, color: true } } },
  })

  await recalculateProjectFileStatus(prisma, suggestion.projectId, suggestion.filePath)
  const io = (req as any).io
  io?.to(`project:${suggestion.projectId}`).emit('project:suggestion:update', {
    ...suggestion,
    status: 'rejected',
    projectId: suggestion.projectId,
  })
  return res.json({ ...suggestion, status: 'rejected', projectId: suggestion.projectId })
})

router.get('/:id/file-statuses', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canRead')
  if (!db.projectFileStatus) return res.json([])

  const rows = await db.projectFileStatus.findMany({
    where: { projectId: req.params.id },
    orderBy: [{ status: 'desc' }, { filePath: 'asc' }],
  })

  return res.json(rows)
})

export { router as projectReviewRouter }
