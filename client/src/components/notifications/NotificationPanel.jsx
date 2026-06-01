import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useUI } from '../../context/UIContext'
import { useSocket } from '../../context/SocketContext'

const API = import.meta.env.VITE_API_URL

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function notifIcon(type) {
  if (type === 'handshake_received') return { icon: '🤝', color: 'var(--teal)' }
  if (type === 'handshake_accepted') return { icon: '✓', color: 'var(--teal)' }
  if (type === 'handshake_declined') return { icon: '○', color: 'var(--text-lo)' }
  if (type === 'new_message')        return { icon: '💬', color: 'var(--teal)' }
  return { icon: '🔔', color: 'var(--text-lo)' }
}

function notifText(n) {
  const name = n.data?.actorDisplayName || 'Someone'
  switch (n.type) {
    case 'handshake_received': return `${name} wants to connect.`
    case 'handshake_accepted': return `${name} accepted your request.`
    case 'handshake_declined': return `Your request to ${name} was not accepted.`
    case 'handshake_expired':  return `Your request to ${name} has expired.`
    case 'new_message':        return `${name}: ${n.data?.messagePreview || '…'}`
    default:                   return n.data?.messagePreview || 'New notification'
  }
}

function notifTarget(n) {
  switch (n.type) {
    case 'handshake_received': return `/handshake/incoming/${n.data?.handshakeId}`
    case 'handshake_accepted': return `/profile/${n.data?.actorId}`
    case 'handshake_declined': return `/profile/${n.data?.actorId}`
    case 'new_message':        return '/'
    default:                   return null
  }
}

export default function NotificationPanel({ onUnreadChange }) {
  const { notificationPanelOpen, closeNotificationPanel } = useUI()
  const { getToken } = useAuth()
  const navigate     = useNavigate()
  const socket       = useSocket()

  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(false)
  const [toast,         setToast]         = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    if (!notificationPanelOpen) return
    setLoading(true)
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/notifications?limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) { const data = await res.json(); setNotifications(data.notifications ?? []) }
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    load()
  }, [notificationPanelOpen, getToken])

  useEffect(() => {
    if (!socket) return
    function onNew(notif) {
      setNotifications(prev => [notif, ...prev])
      onUnreadChange?.(c => (typeof c === 'function' ? c(0) + 1 : (c || 0) + 1))
      clearTimeout(toastTimer.current)
      setToast(notif)
      toastTimer.current = setTimeout(() => setToast(null), 3500)
    }
    socket.on('new_notification', onNew)
    return () => socket.off('new_notification', onNew)
  }, [socket, onUnreadChange])

  useEffect(() => {
    if (!notificationPanelOpen) return
    function onKey(e) { if (e.key === 'Escape') closeNotificationPanel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [notificationPanelOpen, closeNotificationPanel])

  const markAllRead = useCallback(async () => {
    try {
      const token = await getToken()
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      onUnreadChange?.(0)
    } catch { /* non-critical */ }
  }, [getToken, onUnreadChange])

  const markOneRead = useCallback(async (id) => {
    try {
      const token = await getToken()
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
      onUnreadChange?.(c => Math.max(0, (c || 0) - 1))
    } catch { /* non-critical */ }
  }, [getToken, onUnreadChange])

  function handleClick(n) {
    if (!n.isRead) markOneRead(n._id)
    const target = notifTarget(n)
    if (target) { closeNotificationPanel(); navigate(target) }
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="toast-wrap" onClick={() => { const t = notifTarget(toast); if (t) { setToast(null); navigate(t) } }}>
          <div className="toast" style={{ cursor: 'pointer' }}>
            <span>{notifIcon(toast.type).icon}</span>
            {notifText(toast)}
          </div>
        </div>
      )}

      {notificationPanelOpen && (
        <div className="panel-scrim" onClick={closeNotificationPanel} aria-hidden="true"/>
      )}

      <aside className={`panel-drawer${notificationPanelOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="panel-head">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <h2>Notifications</h2>
          {unread > 0 && (
            <button className="btn btn-quiet btn-sm" onClick={markAllRead} style={{ marginRight: 4 }}>
              Mark all read
            </button>
          )}
          <button className="btn-icon" onClick={closeNotificationPanel} aria-label="Close" style={{ width: 34, height: 34 }}>
            ✕
          </button>
        </div>

        <div className="panel-scroll">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <span className="mini-spin"/>
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="panel-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-lo)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
              <p>No notifications yet.</p>
            </div>
          )}
          {!loading && notifications.map(n => {
            const { icon, color } = notifIcon(n.type)
            return (
              <button key={n._id} className={`panel-item${!n.isRead ? ' unread' : ''}`}
                onClick={() => handleClick(n)}>
                <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: `color-mix(in srgb, ${color} 14%, transparent)`, fontSize: 16 }}>
                  {icon}
                </div>
                {!n.isRead && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)',
                    position: 'absolute', top: 14, left: 10, flexShrink: 0 }}/>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="note-text" style={{ fontSize: 13.5 }}>{notifText(n)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-lo)', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.isRead && <span className="unread-dot"/>}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
