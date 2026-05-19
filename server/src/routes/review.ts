import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'

const router = Router()
const prisma = new PrismaClient()

// GET /api/projects/:id/reviews
router.get('/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  const reviews = await prisma.reviewSession.findMany({
    where: { projectId: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
      _count: { select: { comments: true, suggestions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(reviews)
})

// POST /api/projects/:id/reviews
router.post('/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    title:       z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    branchName:  z.string().default('review/' + Date.now()),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const { title, description, branchName } = parsed.data

  const review = await prisma.reviewSession.create({
    data: {
      title,
      description,
      branchName,
      projectId: req.params.id,
      authorId: req.user!.userId,
      status: 'OPEN',
      buildStatus: 'IDLE',
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
    },
  })

  // Log activity
  await prisma.activityEvent.create({
    data: {
      type: 'EDIT',
      userId: req.user!.userId,
      projectId: req.params.id,
      reviewId: review.id,
      description: `opened review: ${title}`,
    },
  })

  const io = (req as any).io
  io?.to(`project:${req.params.id}`).emit('activity:event', {
    type: 'edit', description: `opened review: ${title}`,
    userId: req.user!.userId, timestamp: new Date().toISOString(),
  })

  return res.status(201).json(review)
})

// GET /api/reviews/:id
router.get('/reviews/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const review = await prisma.reviewSession.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, color: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, avatar: true, color: true } },
          replies: { include: { author: { select: { id: true, name: true, color: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
      suggestions: {
        include: {
          author: { select: { id: true, name: true, avatar: true, color: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!review) throw new AppError('Review not found', 404)
  return res.json(review)
})

// POST /api/reviews/:id/merge
router.post('/reviews/:id/merge', requireAuth, async (req: AuthRequest, res: Response) => {
  const review = await prisma.reviewSession.findUnique({
    where: { id: req.params.id },
  })
  if (!review) throw new AppError('Review not found', 404)
  if (review.status !== 'OPEN') throw new AppError('Review is not open', 400)

  const updated = await prisma.reviewSession.update({
    where: { id: req.params.id },
    data: { status: 'MERGED', updatedAt: new Date() },
  })

  await prisma.activityEvent.create({
    data: {
      type: 'MERGE',
      userId: req.user!.userId,
      projectId: review.projectId,
      reviewId: review.id,
      description: `merged review: ${review.title}`,
    },
  })

  const io = (req as any).io
  io?.to(`review:${review.id}`).emit('activity:event', {
    type: 'merge',
    description: `Review merged`,
    userId: req.user!.userId,
    timestamp: new Date().toISOString(),
  })

  return res.json(updated)
})

// POST /api/reviews/:id/close
router.post('/reviews/:id/close', requireAuth, async (req: AuthRequest, res: Response) => {
  const review = await prisma.reviewSession.findUnique({ where: { id: req.params.id } })
  if (!review) throw new AppError('Review not found', 404)

  const updated = await prisma.reviewSession.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED' },
  })
  return res.json(updated)
})

export { router as reviewRouter }
