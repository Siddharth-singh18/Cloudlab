import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server as SocketIO } from 'socket.io'

import { authRouter }     from './routes/auth'
import { projectsRouter } from './routes/projects'
import { filesRouter }    from './routes/files'
import { reviewRouter }   from './routes/review'
import { commentsRouter } from './routes/comments'
import { suggestionsRouter } from './routes/suggestions'
import { projectReviewRouter } from './routes/projectReview'
import { pullRequestsRouter } from './routes/pullRequests'
import { gitRouter }      from './routes/git'
import { githubRouter }   from './routes/github'
import { versionsRouter } from './routes/versions'
import { notificationsRouter } from './routes/notifications'

import { registerSocketHandlers } from './socket'
import { errorHandler }           from './middleware/error'

const PORT = parseInt(process.env.PORT || '3001', 10)
const configuredClientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

function isAllowedOrigin(origin?: string) {
  if (!origin) return true
  if (origin === configuredClientUrl) return true

  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  }

  return false
}

async function main() {
  const app  = express()
  const httpServer = http.createServer(app)

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  const io = new SocketIO(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin || undefined)) {
          callback(null, true)
          return
        }
        callback(new Error('Not allowed by Socket.IO CORS'))
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // ── Middleware ─────────────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin || undefined)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // Attach io to req for use in route handlers
  app.use((req: any, _res, next) => { req.io = io; next() })

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api/auth',        authRouter)
  app.use('/api/projects',    projectsRouter)
  app.use('/api/projects',    filesRouter)
  app.use('/api/projects',    reviewRouter)
  app.use('/api/reviews',     commentsRouter)
  app.use('/api/reviews',     suggestionsRouter)
  app.use('/api/projects',    projectReviewRouter)
  app.use('/api/projects',    pullRequestsRouter)
  app.use('/api/projects',    gitRouter)
  app.use('/api/projects',    versionsRouter)
  app.use('/api/github',      githubRouter)
  app.use('/api/notifications', notificationsRouter)

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

  // ── Socket handlers ────────────────────────────────────────────────────────
  registerSocketHandlers(io)

  // ── Error handler ──────────────────────────────────────────────────────────
  app.use(errorHandler)

  httpServer.listen(PORT, () => {
    console.log(`\n  CloudLab server listening on :${PORT}`)
    console.log(`  Health: http://localhost:${PORT}/api/health\n`)
  })
}

main().catch(console.error)
