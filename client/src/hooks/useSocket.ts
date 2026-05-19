import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'
import { useStore } from '../store'

export function useSocket(token?: string) {
  const {
    setPresences, addComment, resolveComment,
    addSuggestion, updateSuggestion,
    setBuildResult, addActivityEvent,
    addChatMessage,
  } = useStore()

  const connectedRef = useRef(false)

  useEffect(() => {
    if (!token || connectedRef.current) return
    connectedRef.current = true

    const socket = connectSocket(token)

    socket.on('presence:update',    setPresences)
    socket.on('comment:new',        addComment)
    socket.on('comment:resolved',   resolveComment)
    socket.on('suggestion:new',     addSuggestion)
    socket.on('suggestion:update',  updateSuggestion)
    socket.on('project:comment:new', addComment)
    socket.on('project:comment:resolved', resolveComment)
    socket.on('project:suggestion:new', addSuggestion)
    socket.on('project:suggestion:update', updateSuggestion)
    socket.on('build:status',       setBuildResult)
    socket.on('activity:event',     addActivityEvent)
    socket.on('chat:message',       addChatMessage)

    socket.on('connect', () => console.log('[Socket] connected'))
    socket.on('disconnect', reason => console.log('[Socket] disconnected:', reason))
    socket.on('connect_error', err => console.warn('[Socket] error:', err.message))

    return () => {
      disconnectSocket()
      connectedRef.current = false
    }
  }, [token]) // eslint-disable-line

  return getSocket()
}

export function useJoinRoom(roomId: string | undefined) {
  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()
    socket.emit('room:join', roomId)
    return () => { socket.emit('room:leave', roomId) }
  }, [roomId])
}
