import { Queue, Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { execInContainer } from './docker'

const prisma = new PrismaClient()

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

// ─── Queues ───────────────────────────────────────────────────────────────────

export const buildQueue = new Queue('build', { connection })
export const previewQueue = new Queue('preview', { connection })

// ─── Job types ────────────────────────────────────────────────────────────────

export interface BuildJobData {
  projectId: string
  reviewId?: string
  command: string   // e.g. "npm run build" | "npm test"
  socketRoom: string
}

export interface PreviewJobData {
  projectId: string
  reviewId?: string
  storagePath: string
}

// ─── Build Worker ─────────────────────────────────────────────────────────────

export function startBuildWorker(io: import('socket.io').Server) {
  const worker = new Worker<BuildJobData>(
    'build',
    async (job: Job<BuildJobData>) => {
      const { projectId, reviewId, command, socketRoom } = job.data

      // Mark as running in DB
      if (reviewId) {
        await prisma.reviewSession.update({
          where: { id: reviewId },
          data: { buildStatus: 'RUNNING' },
        })
      }

      // Emit running status to room
      io.to(socketRoom).emit('build:status', {
        status: 'running',
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString(),
      })

      const startTime = Date.now()

      try {
        const result = await execInContainer(projectId, ['sh', '-c', command])
        const duration = Date.now() - startTime
        const succeeded = result.exitCode === 0

        const buildStatus = succeeded ? 'SUCCESS' : 'FAILED'

        if (reviewId) {
          await prisma.reviewSession.update({
            where: { id: reviewId },
            data: { buildStatus },
          })
        }

        // Parse TSC / ESLint / Vite errors from stderr
        const errors   = parseErrors(result.stderr)
        const warnings = parseWarnings(result.stdout + result.stderr)

        const payload = {
          status: succeeded ? 'success' : 'failed',
          errors,
          warnings,
          duration,
          timestamp: new Date().toISOString(),
        }

        io.to(socketRoom).emit('build:status', payload)

        // Log activity
        await prisma.activityEvent.create({
          data: {
            type: succeeded ? 'BUILD_PASS' : 'BUILD_FAIL',
            userId: 'system',
            projectId,
            reviewId,
            description: succeeded
              ? `Build passed in ${(duration / 1000).toFixed(2)}s`
              : `Build failed — ${errors.length} error(s)`,
          },
        })

        return payload
      } catch (err: any) {
        const payload = {
          status: 'failed',
          errors: [{ file: 'unknown', line: 0, column: 0, message: err.message, severity: 'error' }],
          warnings: [],
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }
        io.to(socketRoom).emit('build:status', payload)
        throw err
      }
    },
    { connection, concurrency: 4 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[BuildQueue] job ${job?.id} failed:`, err.message)
  })

  console.log('[BuildQueue] Worker started')
  return worker
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseErrors(output: string): Array<{
  file: string; line: number; column: number; message: string; severity: 'error'
}> {
  const errors: ReturnType<typeof parseErrors> = []
  // TypeScript error pattern: src/file.ts(10,5): error TS2304: ...
  const tsPattern = /(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)/g
  let m
  while ((m = tsPattern.exec(output)) !== null) {
    errors.push({
      file: m[1].trim(),
      line: parseInt(m[2]),
      column: parseInt(m[3]),
      message: `${m[4]}: ${m[5]}`,
      severity: 'error',
    })
  }
  return errors
}

function parseWarnings(output: string): Array<{
  file: string; line: number; message: string
}> {
  const warnings: ReturnType<typeof parseWarnings> = []
  const warnPattern = /(.+?)\((\d+),\d+\): warning .+?: (.+)/g
  let m
  while ((m = warnPattern.exec(output)) !== null) {
    warnings.push({ file: m[1].trim(), line: parseInt(m[2]), message: m[3] })
  }
  return warnings
}

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

export async function enqueueBuild(data: BuildJobData) {
  return buildQueue.add('build', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  })
}

export async function enqueuePreviewDeploy(data: PreviewJobData) {
  return previewQueue.add('preview', data, {
    removeOnComplete: 20,
  })
}
