import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireProjectAccess } from '../lib/projectAccess'
import {
  createProjectCheckpoint,
  deleteProjectCheckpoint,
  restoreProjectCheckpoint,
} from '../lib/versioning'

const router = Router()
const prisma = new PrismaClient()
const db = prisma as any

router.get('/:id/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canRead')
  if (!db.projectVersion) return res.json([])

  const versions = await db.projectVersion.findMany({
    where: { projectId: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(versions)
})

router.post('/:id/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const schema = z.object({ label: z.string().max(200).optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const version = await createProjectCheckpoint(
    prisma,
    req.params.id,
    req.user!.userId,
    parsed.data.label || 'Manual checkpoint',
    false
  )
  return res.status(201).json(version)
})

router.post('/:id/versions/:versionId/restore', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canWrite')
  const restored = await restoreProjectCheckpoint(prisma, req.params.id, req.params.versionId, req.user!.userId)
  return res.json({ ok: true, restored })
})

router.delete('/:id/versions/:versionId', requireAuth, async (req: AuthRequest, res: Response) => {
  await requireProjectAccess(prisma, req.params.id, req.user!.userId, 'canManage')
  const deleted = await deleteProjectCheckpoint(prisma, req.params.id, req.params.versionId)
  return res.json({ ok: true, deleted })
})

export { router as versionsRouter }
