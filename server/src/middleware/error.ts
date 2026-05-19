import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' })
  }

  console.error('[Error]', err)
  return res.status(500).json({ error: 'Internal server error' })
}
