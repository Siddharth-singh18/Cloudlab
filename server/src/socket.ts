import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import * as pty from 'node-pty'
import path from 'path'
import { requireProjectAccess } from './lib/projectAccess'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Map: roomId -> Map<userId, presenceData>
const roomPresences = new Map<string, Map<string, any>>()

// Map: socketId:terminalId -> pty process
const terminals = new Map<string, ReturnType<typeof pty.spawn>>()
const terminalProjects = new Map<string, string>()
const nodeBinDir = path.dirname(process.execPath)
const pythonBinDir = '/usr/bin'

function authenticateSocket(socket: Socket): { userId: string; email: string } | null {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) return null
    return jwt.verify(token as string, JWT_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

export function registerSocketHandlers(io: Server) {
  // Auth middleware
  io.use((socket, next) => {
    const payload = authenticateSocket(socket)
    if (!payload) return next(new Error('Unauthorized'))
    ;(socket as any).user = payload
    next()
  })

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as { userId: string; email: string }
    console.log(`[Socket] connected: ${user.userId} (${socket.id})`)

    // ── Room join/leave ─────────────────────────────────────────────────────
    socket.on('room:join', async (roomId: string) => {
      socket.join(roomId)

      if (!roomPresences.has(roomId)) {
        roomPresences.set(roomId, new Map())
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, name: true, avatar: true, color: true },
      }).catch(() => null)

      if (dbUser) {
        roomPresences.get(roomId)!.set(user.userId, {
          userId: user.userId,
          user: dbUser,
        })
      }

      // Broadcast updated presence list
      broadcastPresence(io, roomId)

      // Notify others
      socket.to(roomId).emit('activity:event', {
        id: `evt-${Date.now()}`,
        type: 'join',
        userId: user.userId,
        user: dbUser || { id: user.userId, name: 'User', color: '#888' },
        description: 'joined the session',
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('room:leave', (roomId: string) => {
      leaveRoom(io, socket, roomId, user.userId)
    })

    // ── Presence updates ────────────────────────────────────────────────────
    socket.on('presence:update', async (data: Partial<{
      filePath: string; line: number; column: number;
      selection: { startLine: number; startColumn: number; endLine: number; endColumn: number }
    }>) => {
      // Update presence in all rooms this socket is in
      socket.rooms.forEach((roomId) => {
        if (roomId === socket.id) return
        const room = roomPresences.get(roomId)
        if (!room) return
        const existing = room.get(user.userId) || {}
        room.set(user.userId, { ...existing, ...data, userId: user.userId })
        broadcastPresence(io, roomId)
      })
    })

    // ── Terminal ────────────────────────────────────────────────────────────
    socket.on('terminal:create', async (payload: { projectId: string; terminalId: string; force?: boolean }) => {
      const { projectId, terminalId, force } = payload
      if (!projectId || !terminalId) {
        socket.emit('terminal:data', { terminalId: terminalId || 'default', data: '\r\n\x1b[31mMissing project id or terminal id.\x1b[0m\r\n' })
        return
      }

      const termKey = `${socket.id}:${terminalId}`

      try {
        const access = await requireProjectAccess(prisma, projectId, user.userId, 'canWrite')
        const existing = terminals.get(termKey)
        const existingProjectId = terminalProjects.get(termKey)

        if (existing && !force && existingProjectId === projectId) {
          socket.emit('terminal:ready', { projectId, terminalId })
          return
        }

        if (existing) {
          existing.kill()
          terminals.delete(termKey)
          terminalProjects.delete(termKey)
        }

        const projectCwd = path.resolve(access.project.storagePath)
        
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true },
        })
        const username = dbUser?.name?.replace(/\s+/g, '').toLowerCase() || 'user'
        const projectName = access.project.name?.replace(/\s+/g, '-').toLowerCase() || 'project'
        
        const useDocker = process.env.USE_DOCKER_TERMINAL === 'true'
        let term: ReturnType<typeof pty.spawn>;

        if (useDocker) {
          const initScript = `cat << 'EOF' > /tmp/.ashrc
rm() {
  for arg in "$@"; do
    if [ "$arg" = "/" ] || [ "$arg" = "/workspace" ] || [ "$arg" = "." ] || [ "$arg" = ".." ]; then
      echo "rm: cannot remove '$arg': Permission denied (CloudLab protection)"
      return 1
    fi
  done
  /bin/rm "$@"
}
PS1="\\033[1;32m${username}@${projectName}\\033[0m:\\033[1;34m\\w\\033[0m\\$ "
EOF
if ! command -v git >/dev/null 2>&1; then
  echo -e "\\033[1;34mInstalling git & gh cli...\\033[0m"
  apk add --no-cache git github-cli >/dev/null 2>&1
fi
ENV=/tmp/.ashrc ash`

          term = pty.spawn('docker', [
            'run', '-it', '--rm',
            '-v', `${projectCwd}:/workspace`,
            '-w', '/workspace',
            'node:20-alpine',
            'sh', '-c', initScript
          ], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: projectCwd,
            env: process.env,
          })
        } else {
          const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash'
          term = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: projectCwd,
            env: { ...process.env, PS1: `\\033[1;32m${username}@${projectName}\\033[0m:\\033[1;34m\\w\\033[0m\\$ ` } as any,
          })
        }

        let buffer = ''
        let bufferTimeout: NodeJS.Timeout | null = null

        term.onData((data) => {
          buffer += data
          if (buffer.length > 50000) {
             socket.emit('terminal:data', { terminalId, data: buffer })
             buffer = ''
             if (bufferTimeout) clearTimeout(bufferTimeout)
             bufferTimeout = null
             return
          }
          if (!bufferTimeout) {
            bufferTimeout = setTimeout(() => {
              socket.emit('terminal:data', { terminalId, data: buffer })
              buffer = ''
              bufferTimeout = null
            }, 15)
          }
        })
        term.onExit(() => {
          if (bufferTimeout) clearTimeout(bufferTimeout)
          if (buffer) socket.emit('terminal:data', { terminalId, data: buffer })
          terminals.delete(termKey)
          terminalProjects.delete(termKey)
        })

        terminals.set(termKey, term)
        terminalProjects.set(termKey, projectId)
        socket.emit('terminal:data', { terminalId, data: `\r\n\x1b[1;32m CloudLab Terminal\x1b[0m attached to ${projectCwd}\r\n` })
        socket.emit('terminal:ready', { projectId, terminalId })
      } catch (error: any) {
        socket.emit(
          'terminal:data',
          { terminalId, data: `\r\n\x1b[31m${error?.message || 'Unable to create terminal session.'}\x1b[0m\r\n` }
        )
      }
    })

    socket.on('terminal:input', ({ terminalId, data }: { terminalId: string; data: string }) => {
      const termKey = `${socket.id}:${terminalId}`
      terminals.get(termKey)?.write(data)
    })

    socket.on('terminal:resize', ({ terminalId, cols, rows }: { terminalId: string; cols: number; rows: number }) => {
      const termKey = `${socket.id}:${terminalId}`
      terminals.get(termKey)?.resize(cols, rows)
    })

    socket.on('terminal:run', async ({ projectId, terminalId, command }: { projectId: string; terminalId: string; command: string }) => {
      const termKey = `${socket.id}:${terminalId}`
      const term = terminals.get(termKey)
      if (!term) {
        socket.emit('terminal:data', { terminalId, data: '\r\n\x1b[31mTerminal session is not ready yet.\x1b[0m\r\n' })
        return
      }

      try {
        await requireProjectAccess(prisma, projectId, user.userId, 'canWrite')
        if (terminalProjects.get(termKey) !== projectId) {
          socket.emit('terminal:data', { terminalId, data: '\r\n\x1b[31mTerminal is attached to a different project.\x1b[0m\r\n' })
          socket.emit('terminal:ready', { projectId: terminalProjects.get(termKey) || '', terminalId })
          return
        }

        term.write('\u0003')
        term.write(`${command}\r`)
      } catch (error: any) {
        socket.emit(
          'terminal:data',
          { terminalId, data: `\r\n\x1b[31m${error?.message || 'Unable to run command in terminal.'}\x1b[0m\r\n` }
        )
      }
    })

    // ── Build trigger ───────────────────────────────────────────────────────
    socket.on('build:trigger', async (projectId: string) => {
      // Emit "running"
      io.to(`project:${projectId}`).emit('build:status', {
        status: 'running',
        errors: [], warnings: [],
        timestamp: new Date().toISOString(),
      })

      // Simulate build (in production, enqueue a BullMQ job to run npm run build in container)
      setTimeout(() => {
        io.to(`project:${projectId}`).emit('build:status', {
          status: 'success',
          errors: [],
          warnings: [
            { file: 'src/AuthProvider.tsx', line: 9, message: "'error' assigned but never used" },
          ],
          duration: 3420,
          timestamp: new Date().toISOString(),
        })
      }, 3000)
    })

    // ── Chat ────────────────────────────────────────────────────────────────
    socket.on('chat:send', async ({ roomId, body }: { roomId: string; body: string }) => {
      if (!body?.trim()) return

      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, name: true, avatar: true, color: true },
      }).catch(() => null)

      const msg = {
        id: `msg-${Date.now()}`,
        roomId,
        userId: user.userId,
        user: dbUser || { id: user.userId, name: 'User', color: '#888' },
        body: body.trim(),
        createdAt: new Date().toISOString(),
      }

      io.to(roomId).emit('chat:message', msg)

      // Persist
      await prisma.chatMessage.create({
        data: {
          body: body.trim(),
          userId: user.userId,
          ...(roomId.startsWith('project:') ? { projectId: roomId.replace('project:', '') } : {}),
          ...(roomId.startsWith('review:')  ? { reviewId:  roomId.replace('review:', '') }  : {}),
        },
      }).catch(() => {})
    })

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${user.userId}`)

      // Kill all terminals for this socket
      for (const [key, term] of terminals.entries()) {
        if (key.startsWith(`${socket.id}:`)) {
          term.kill()
          terminals.delete(key)
          terminalProjects.delete(key)
        }
      }

      // Remove from all rooms
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) leaveRoom(io, socket, roomId, user.userId)
      })
    })
  })
}

function leaveRoom(io: Server, socket: Socket, roomId: string, userId: string) {
  socket.leave(roomId)
  roomPresences.get(roomId)?.delete(userId)
  broadcastPresence(io, roomId)
}

function broadcastPresence(io: Server, roomId: string) {
  const presences = Array.from(roomPresences.get(roomId)?.values() || [])
  io.to(roomId).emit('presence:update', presences)
}
