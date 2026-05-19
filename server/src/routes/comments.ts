import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'

// ─── Comments ─────────────────────────────────────────────────────────────────
const commentsRouter = Router()
const prisma = new PrismaClient()

// GET /api/reviews/:id/comments
commentsRouter.get('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  const comments = await prisma.comment.findMany({
    where: { reviewId: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, avatar: true, color: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return res.json(comments)
})

// POST /api/reviews/:id/comments
commentsRouter.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    filePath:  z.string(),
    lineStart: z.number().int().positive(),
    lineEnd:   z.number().int().positive(),
    body:      z.string().min(1).max(5000),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const comment = await prisma.comment.create({
    data: {
      ...parsed.data,
      reviewId: req.params.id,
      authorId: req.user!.userId,
    } as any,
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  const io = (req as any).io
  io?.to(`review:${req.params.id}`).emit('comment:new', { ...comment, replies: [] })

  return res.status(201).json({ ...comment, replies: [] })
})

// PATCH /api/comments/:id/resolve
commentsRouter.patch('/comments/:id/resolve', requireAuth, async (req: AuthRequest, res: Response) => {
  const comment = await prisma.comment.update({
    where: { id: req.params.id },
    data: { resolved: true },
  })

  const io = (req as any).io
  io?.to(`review:${comment.reviewId}`).emit('comment:resolved', req.params.id)

  return res.json(comment)
})

// POST /api/comments/:id/replies
commentsRouter.post('/comments/:id/replies', requireAuth, async (req: AuthRequest, res: Response) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'body required' })

  const reply = await prisma.commentReply.create({
    data: {
      commentId: req.params.id,
      authorId: req.user!.userId,
      body,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })
  return res.status(201).json(reply)
})

// ─── Suggestions ──────────────────────────────────────────────────────────────
const suggestionsRouter = Router()

// GET /api/reviews/:id/suggestions
suggestionsRouter.get('/:id/suggestions', requireAuth, async (req: AuthRequest, res: Response) => {
  const suggestions = await prisma.suggestion.findMany({
    where: { reviewId: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return res.json(suggestions)
})

// POST /api/reviews/:id/suggestions
suggestionsRouter.post('/:id/suggestions', requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    filePath:      z.string(),
    lineStart:     z.number().int().positive(),
    lineEnd:       z.number().int().positive(),
    originalCode:  z.string(),
    suggestedCode: z.string(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const suggestion = await prisma.suggestion.create({
    data: {
      ...parsed.data,
      reviewId: req.params.id,
      authorId: req.user!.userId,
      status: 'PENDING',
    } as any,
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  const io = (req as any).io
  io?.to(`review:${req.params.id}`).emit('suggestion:new', suggestion)

  return res.status(201).json(suggestion)
})

// POST /api/suggestions/:id/accept
suggestionsRouter.post('/suggestions/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  const suggestion = await prisma.suggestion.update({
    where: { id: req.params.id },
    data: { status: 'ACCEPTED' },
    include: { author: { select: { id: true, name: true, color: true } } },
  })

  const io = (req as any).io
  io?.to(`review:${suggestion.reviewId}`).emit('suggestion:update', suggestion)

  return res.json(suggestion)
})

// POST /api/suggestions/:id/reject
suggestionsRouter.post('/suggestions/:id/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  const suggestion = await prisma.suggestion.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED' },
    include: { author: { select: { id: true, name: true, color: true } } },
  })

  const io = (req as any).io
  io?.to(`review:${suggestion.reviewId}`).emit('suggestion:update', suggestion)

  return res.json(suggestion)
})

export { commentsRouter, suggestionsRouter }
