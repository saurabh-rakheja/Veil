import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useSocket } from './SocketContext'

const API = import.meta.env.VITE_API_URL

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { isSignedIn, getToken } = useAuth()
  const socket = useSocket()

  const [unreadByConversation, setUnreadByConversation] = useState({})
  const [totalUnreadMessages,  setTotalUnreadMessages]  = useState(0)
  const [unreadNotifications,  setUnreadNotifications]  = useState(0)
  const [toasts,               setToasts]               = useState([])
  const activeConvRef = useRef(null)

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markConversationRead = useCallback((conversationId) => {
    setUnreadByConversation(prev => {
      const count = prev[conversationId] || 0
      if (count === 0) return prev
      const next = { ...prev }
      delete next[conversationId]
      setTotalUnreadMessages(t => Math.max(0, t - count))
      return next
    })
  }, [])

  const setActiveConversation = useCallback((conversationId) => {
    activeConvRef.current = conversationId
    if (conversationId) {
      markConversationRead(conversationId)
    }
  }, [markConversationRead])

  // ── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !socket) return

    const onMessage = (message) => {
      const cid = message.conversationId
      if (!cid) return
      if (activeConvRef.current === cid) return

      setUnreadByConversation(prev => ({
        ...prev,
        [cid]: (prev[cid] || 0) + 1,
      }))
      setTotalUnreadMessages(t => t + 1)

      addToast({
        type:           'new_message',
        title:          'New message',
        body:           (message.content || '').slice(0, 60) +
                        (message.content?.length > 60 ? '...' : ''),
        conversationId: cid,
        senderId:       message.senderId || message.sender,
      })
    }

    const onNotification = (notif) => {
      setUnreadNotifications(n => n + 1)
      const actor = notif.data?.actorDisplayName || 'Someone'

      if (notif.type === 'handshake_accepted') {
        addToast({
          type:           'handshake_accepted',
          title:          'Connection accepted',
          body:           `${actor} accepted your connection request`,
          conversationId: null,
        })
      }
      if (notif.type === 'handshake_received') {
        addToast({
          type:           'handshake_received',
          title:          'New connection request',
          body:           `${actor} wants to connect with you`,
          conversationId: null,
        })
      }
    }

    socket.on('receive_message',  onMessage)
    socket.on('new_notification', onNotification)

    return () => {
      socket.off('receive_message',  onMessage)
      socket.off('new_notification', onNotification)
    }
  }, [socket, isSignedIn, addToast])

  // ── Load initial unread counts from DB on sign-in ─────────────────
  useEffect(() => {
    if (!isSignedIn) return
    const load = async () => {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/messages/unread-counts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.counts) {
          const map = {}
          data.counts.forEach(c => { map[c.conversationId] = c.unread })
          setUnreadByConversation(map)
          setTotalUnreadMessages(data.total || 0)
        }
      } catch (e) {
        console.error('[Notif] unread load:', e)
      }
    }
    load()
  }, [isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotificationContext.Provider value={{
      unreadByConversation,
      totalUnreadMessages,
      unreadNotifications,
      toasts,
      addToast,
      removeToast,
      markConversationRead,
      setActiveConversation,
      setUnreadNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
