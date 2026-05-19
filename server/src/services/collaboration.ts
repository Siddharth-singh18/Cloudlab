/**
 * Yjs Collaboration Service
 *
 * Manages shared Y.Doc instances for real-time collaborative editing.
 * One Y.Doc per file, keyed by "projectId:filePath".
 *
 * In production, replace in-memory storage with y-leveldb or y-redis.
 */

import * as Y from 'yjs'
import { Server as SocketIO, Socket } from 'socket.io'

interface DocEntry {
  doc: Y.Doc
  clients: Set<string>  // socket IDs
  lastModified: number
}

// In-memory doc store  — swap for y-leveldb in production
const docs = new Map<string, DocEntry>()

function getDocKey(projectId: string, filePath: string) {
  return `${projectId}:${filePath}`
}

function getOrCreateDoc(key: string): DocEntry {
  if (!docs.has(key)) {
    docs.set(key, {
      doc: new Y.Doc(),
      clients: new Set(),
      lastModified: Date.now(),
    })
  }
  return docs.get(key)!
}

export function registerYjsHandlers(io: SocketIO, socket: Socket) {
  const userId = (socket as any).user?.userId as string

  // Client requests to sync a file
  socket.on('yjs:sync', ({ projectId, filePath, clientStateVector }: {
    projectId: string
    filePath: string
    clientStateVector: number[]  // Uint8Array serialised as number[]
  }) => {
    const key = getDocKey(projectId, filePath)
    const entry = getOrCreateDoc(key)
    entry.clients.add(socket.id)

    const sv = new Uint8Array(clientStateVector)
    const update = Y.encodeStateAsUpdate(entry.doc, sv)
    const serverStateVector = Y.encodeStateVector(entry.doc)

    // Send current state to the new client
    socket.emit('yjs:sync_reply', {
      projectId,
      filePath,
      update: Array.from(update),
      serverStateVector: Array.from(serverStateVector),
    })
  })

  // Client sends an update (keystroke, paste, etc.)
  socket.on('yjs:update', ({ projectId, filePath, update }: {
    projectId: string
    filePath: string
    update: number[]
  }) => {
    const key = getDocKey(projectId, filePath)
    const entry = getOrCreateDoc(key)

    const updateBytes = new Uint8Array(update)
    Y.applyUpdate(entry.doc, updateBytes)
    entry.lastModified = Date.now()

    // Broadcast to all OTHER clients editing this file
    const room = `yjs:${key}`
    socket.to(room).emit('yjs:update', { projectId, filePath, update })

    // Join the room so future broadcasts reach this client
    socket.join(room)
  })

  // Awareness (cursor positions, user presence in editor)
  socket.on('yjs:awareness', ({ projectId, filePath, awareness }: {
    projectId: string
    filePath: string
    awareness: Record<string, any>
  }) => {
    const room = `yjs:${getDocKey(projectId, filePath)}`
    socket.to(room).emit('yjs:awareness', {
      clientId: socket.id,
      userId,
      awareness,
    })
  })

  socket.on('disconnect', () => {
    // Remove client from all docs
    docs.forEach((entry, key) => {
      if (entry.clients.has(socket.id)) {
        entry.clients.delete(socket.id)
        // Notify others that this client left
        const room = `yjs:${key}`
        io.to(room).emit('yjs:awareness_remove', { clientId: socket.id })
      }
    })
  })
}

// Periodic cleanup: remove docs with no clients that haven't been touched in 1h
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  docs.forEach((entry, key) => {
    if (entry.clients.size === 0 && entry.lastModified < cutoff) {
      docs.delete(key)
    }
  })
}, 10 * 60 * 1000)
