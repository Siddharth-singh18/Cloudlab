import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const events = await prisma.activityEvent.findMany({
    where: {
      OR: [
        { userId: req.user!.userId },
        { project: { ownerId: req.user!.userId } },
        { project: { collaborators: { some: { userId: req.user!.userId } } } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, avatar: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return res.json(events.map((event) => ({
    id: event.id,
    type: event.type,
    content: event.description,
    read: true,
    createdAt: event.createdAt,
    actor: event.user,
  })))
})

router.get('/unread-count', requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.json({ count: 0 })
})

router.patch('/:id/read', requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.json({ ok: true })
})

router.patch('/read-all', requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.json({ ok: true })
})

router.delete('/:id', requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.json({ ok: true })
})

export { router as notificationsRouter }
