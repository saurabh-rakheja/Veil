import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { io as socketIO } from 'socket.io-client'

const SocketContext          = createContext(null)
const SocketConnectedContext = createContext(false)

export function SocketProvider({ children }) {
  const { userId, isSignedIn } = useAuth()
  const socketRef = useRef(null)
  const [socket,      setSocket]      = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isSignedIn || !userId) return

    const s = socketIO('/', { transports: ['websocket', 'polling'] })

    const register = () => {
      s.emit('register_socket', { userId })
      console.log('[Socket] emitted register_socket for:', userId)
    }

    s.on('connect', () => {
      console.log('[Socket] connected:', s.id)
      setIsConnected(true)
      register()
    })

    s.on('registered', ({ userId: uid, socketId }) => {
      console.log('[Socket] registered confirmation — userId:', uid, 'socketId:', socketId)
    })

    s.on('reconnect', (attempt) => {
      console.log('[Socket] reconnected after', attempt, 'attempt(s)')
      setIsConnected(true)
      register()
    })

    s.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason)
      setIsConnected(false)
    })

    s.on('connect_error', (err) => {
      console.error('[Socket] connection error:', err.message)
    })

    socketRef.current = s
    setSocket(s)

    return () => {
      s.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [isSignedIn, userId])

  return (
    <SocketContext.Provider value={socket}>
      <SocketConnectedContext.Provider value={isConnected}>
        {children}
      </SocketConnectedContext.Provider>
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}

export function useSocketConnected() {
  return useContext(SocketConnectedContext)
}
