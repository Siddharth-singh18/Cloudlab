import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL || '', {
      autoConnect: false,
      withCredentials: true,
    })
  }
  return socket
}

export function connectSocket(token: string) {
  const s = getSocket()
  s.auth = { token }
  s.connect()
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
}
