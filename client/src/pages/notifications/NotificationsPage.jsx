import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

const API = import.meta.env.VITE_API_URL

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`
}

const NOTE_ICON = {
  handshake_received: { icon: '🤝', c: 'var(--teal)' },
  handshake_accepted: { icon: '✓',  c: 'var(--teal)' },
  handshake_declined: { icon: '○',  c: 'var(--text-lo)' },
  handshake_expired:  { icon: '⏱', c: 'var(--gold)' },
  new_message:        { icon: '💬', c: 'var(--teal)' },
  vouch:              { icon: '★',  c: 'var(--gold)' },
  safety:             { icon: '🛡', c: 'var(--gold)' },
}

function noteText(n) {
  const name = n.data?.actorDisplayName || 'Someone'
  switch (n.type) {
    case 'handshake_received': return { text: `${name} wants to connect.`, sub: 'Review their request' }
    case 'handshake_accepted': return { text: `${name} accepted your request.`, sub: "You're now connected" }
    case 'handshake_declined': return { text: `Your request to ${name} was not accepted.`, sub: 'You can send a new request in 30 days' }
    case 'handshake_expired':  return { text: `Your request to ${name} has expired.`, sub: 'Visit their profile to reconnect' }
    case 'new_message':        return { text: `${name}: ${n.data?.messagePreview || '…'}`, sub: null }
    default: return { text: n.data?.messagePreview || 'New notification', sub: null }
  }
}

function noteTarget(n) {
  switch (n.type) {
    case 'handshake_received': return `/handshake/incoming/${n.data?.handshakeId}`
    case 'handshake_accepted': return `/profile/${n.data?.actorId}`
    case 'handshake_declined': return `/profile/${n.data?.actorId}`
    case 'new_message':        return `/chats`
    default: return null
  }
}

export default function NotificationsPage() {
  const { getToken } = useAuth()
  const navigate     = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/notifications?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) { const d = await res.json(); setNotes(d.notifications ?? []) }
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    load()
  }, [getToken])

  const markAll = useCallback(async () => {
    try {
      const token = await getToken()
      await fetch(`${API}/api/notifications/read-all`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
      setNotes(p => p.map(n => ({ ...n, isRead: true })))
    } catch { /* non-critical */ }
  }, [getToken])

  async function markOne(id) {
    try {
      const token = await getToken()
      await fetch(`${API}/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
      setNotes(p => p.map(n => n._id === id ? { ...n, isRead: true } : n))
    } catch { /* non-critical */ }
  }

  function handleClick(n) {
    if (!n.isRead) markOne(n._id)
    const target = noteTarget(n)
    if (target) navigate(target)
  }

  const unread  = notes.filter(n => !n.isRead).length
  const today   = notes.filter(n => {
    const h = Math.floor((Date.now() - new Date(n.createdAt)) / 3600000)
    return h < 24
  })
  const earlier = notes.filter(n => {
    const h = Math.floor((Date.now() - new Date(n.createdAt)) / 3600000)
    return h >= 24
  })

  if (loading) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <span className="mini-spin"/>
    </div>
  )

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600 }}>
          {unread ? `${unread} unread` : "You're all caught up"}
        </span>
        {unread > 0 && (
          <button className="btn btn-quiet btn-sm" onClick={markAll}>
            ✓ Mark all read
          </button>
        )}
      </div>

      {notes.length === 0 && (
        <div className="empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <p>No notifications yet.</p>
          <span>Activity across your network will appear here.</span>
        </div>
      )}

      {today.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Today</h3>
          </div>
          <div className="note-list">
            {today.map(n => <NoteRow key={n._id} n={n} onClick={handleClick}/>)}
          </div>
        </>
      )}

      {earlier.length > 0 && (
        <>
          <div style={{ height: 22 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Earlier</h3>
          </div>
          <div className="note-list">
            {earlier.map(n => <NoteRow key={n._id} n={n} onClick={handleClick}/>)}
          </div>
        </>
      )}
    </div>
  )
}

function NoteRow({ n, onClick }) {
  const meta = NOTE_ICON[n.type] || { icon: '🔔', c: 'var(--text-lo)' }
  const { text, sub } = noteText(n)
  return (
    <a className={`note-row${n.unread || !n.isRead ? ' unread' : ''}`}
      onClick={() => onClick(n)} style={{ cursor: 'pointer' }}>
      <div className="note-ico" style={{ color: meta.c, background: `color-mix(in srgb, ${meta.c} 14%, transparent)`, fontSize: 17 }}>
        {meta.icon}
      </div>
      <div style={{ width: 38 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="note-text">{text}</div>
        {sub && <div className="note-sub">{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600 }}>{timeAgo(n.createdAt)}</span>
        {!n.isRead && <span className="unread-dot"/>}
      </div>
    </a>
  )
}
