import { useEffect, useState, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import { getSocket } from '../lib/socket'
import { useStore } from '../store'

interface UseCollaborationOptions {
  projectId: string
  filePath: string
  onRemoteUpdate?: (content: string) => void
}

export function useCollaboration({ projectId, filePath, onRemoteUpdate }: UseCollaborationOptions) {
  const { currentUser, setPresences } = useStore()
  
  const prevFilePath = useRef(filePath)
  const docRef = useRef<Y.Doc | null>(null)
  const textRef = useRef<Y.Text | null>(null)

  // Initialize or recreate synchronously
  if (!docRef.current || prevFilePath.current !== filePath) {
    docRef.current = new Y.Doc()
    textRef.current = docRef.current.getText('content')
    prevFilePath.current = filePath
  }

  const doc = docRef.current!
  const text = textRef.current!
  const socket = getSocket()

  useEffect(() => {
    if (!projectId || !filePath) return

    // ── Sync with server ──────────────────────────────────────────────────
    const sv = Y.encodeStateVector(doc)
    socket.emit('yjs:sync' as any, {
      projectId,
      filePath,
      clientStateVector: Array.from(sv),
    })

    const onSyncReply = ({ update }: { update: number[] }) => {
      Y.applyUpdate(doc, new Uint8Array(update))
    }

    const onYjsUpdate = ({ update, filePath: fp }: { update: number[]; filePath: string }) => {
      if (fp !== filePath) return
      Y.applyUpdate(doc, new Uint8Array(update))
      onRemoteUpdate?.(text.toString())
    }

    socket.on('yjs:sync_reply', onSyncReply)
    socket.on('yjs:update', onYjsUpdate)

    // ── Observe local changes and broadcast ───────────────────────────────
    const observer = (events: Y.YEvent<any>[], tr: Y.Transaction) => {
      if (tr.local) {
        const update = Y.encodeStateAsUpdate(doc)
        socket.emit('yjs:update' as any, {
          projectId,
          filePath,
          update: Array.from(update),
        })
      }
    }
    text.observeDeep(observer)

    return () => {
      try { text.unobserveDeep(observer) } catch (e) {}
      socket.off('yjs:sync_reply', onSyncReply)
      socket.off('yjs:update', onYjsUpdate)
    }
  }, [projectId, filePath, doc, text, socket, onRemoteUpdate]) // eslint-disable-line

  // ── Presence ─────────────────────────────────────────────────────────────
  const updatePresence = useCallback((line?: number, column?: number) => {
    socket.emit('presence:update' as any, { filePath, line, column })
  }, [filePath, socket])

  // ── Apply local edit to Y.Doc ─────────────────────────────────────────────
  const applyEdit = useCallback((
    newContent: string,
    _oldContent: string
  ) => {
    if (!text) return
    const currentText = text.toString()
    if (currentText === newContent) return
    doc.transact(() => {
      text.delete(0, text.length)
      text.insert(0, newContent)
    })
  }, [doc, text])

  return { applyEdit, updatePresence, ytext: text, ydoc: doc }
}
