import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: string
  email: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthPayload
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7)
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthPayload
    }
  } catch { /* ignore */ }
  next()
}
