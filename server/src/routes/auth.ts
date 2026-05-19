import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

function signToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES as any })
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const schema = z.object({
    name:     z.string().min(2).max(50),
    email:    z.string().email(),
    password: z.string().min(8),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })

  const { name, email, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, avatar: true, color: true },
  })

  const token = signToken(user.id, user.email)
  return res.status(201).json({ token, user })
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const schema = z.object({
    email:    z.string().email(),
    password: z.string(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken(user.id, user.email)
  const { passwordHash: _, ...safeUser } = user
  return res.json({ token, user: safeUser })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, avatar: true, color: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json(user)
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  // Stateless JWT — client drops the token
  return res.json({ ok: true })
})

export { router as authRouter }
