import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useUI } from '../../context/UIContext'
import { useNotifications } from '../../context/NotificationContext'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)   return 'now'
  if (mins < 60)  return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7)   return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncate(str, len = 40) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export default function ConversationsPanel() {
  const { conversationsPanelOpen, closeConversationsPanel } = useUI()
  const { getToken }    = useAuth()
  const navigate        = useNavigate()
  const { unreadByConversation, markConversationRead } = useNotifications()

  const [pendingCount,  setPendingCount]  = useState(0)
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (!conversationsPanelOpen) return
    setLoading(true)
    async function fetchAll() {
      try {
        const token   = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [pendRes, convsRes] = await Promise.all([
          fetch('/api/handshake/pending',      { headers }),
          fetch('/api/messages/conversations', { headers }),
        ])
        if (pendRes.ok)  { const d = await pendRes.json();  setPendingCount(d.length) }
        if (convsRes.ok) { const d = await convsRes.json(); setConversations(d.conversations || []) }
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [conversationsPanelOpen, getToken])

  useEffect(() => {
    if (!conversationsPanelOpen) return
    function onKey(e) { if (e.key === 'Escape') closeConversationsPanel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [conversationsPanelOpen, closeConversationsPanel])

  function openChat(connectionId, otherUserId) {
    markConversationRead(connectionId)
    closeConversationsPanel()
    navigate(otherUserId ? `/chat/${connectionId}?recipientId=${otherUserId}` : `/chat/${connectionId}`)
  }

  return (
    <>
      {conversationsPanelOpen && (
        <div className="panel-scrim" onClick={closeConversationsPanel} aria-hidden="true"/>
      )}
      <aside className={`panel-drawer${conversationsPanelOpen ? ' open' : ''}`} aria-label="Conversations">
        <div className="panel-head">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-1L3 20l1-4a8.5 8.5 0 0 1-1-4 8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z"/></svg>
          <h2>Messages</h2>
          <button className="btn-icon" onClick={closeConversationsPanel} aria-label="Close" style={{ width: 34, height: 34 }}>
            ✕
          </button>
        </div>

        <div className="panel-scroll">
          {/* Requests link */}
          <Link to="/connections/requests" onClick={closeConversationsPanel}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--line)',
              textDecoration: 'none', color: 'var(--text)', transition: 'background .14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
              Connection requests
            </span>
            {pendingCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: 0 }}>{pendingCount}</span>
            )}
          </Link>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <span className="mini-spin"/>
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="panel-empty">
              <p>No conversations yet.</p>
              <span style={{ fontSize: 13, color: 'var(--text-lo)' }}>Start a connection request to begin chatting.</span>
            </div>
          )}

          {!loading && conversations.map(conv => {
            const preview = conv.lastMessage ? truncate(conv.lastMessage.content) : 'Say hello'
            const ts      = conv.lastMessage?.createdAt || conv.connectedAt
            const unread  = unreadByConversation[conv.connectionId] || 0
            return (
              <button key={conv.connectionId}
                className={`panel-item${unread > 0 ? ' unread' : ''}`}
                onClick={() => openChat(conv.connectionId, conv.otherUserId)}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--teal-dim)',
                  display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16, fontWeight: 700,
                  color: 'var(--teal)', border: '1px solid var(--teal-line)' }}>
                  {(conv.displayName || 'A').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span className="cr-alias">{conv.displayName || 'Anonymous'}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-lo)', fontWeight: 600, flexShrink: 0 }}>{timeAgo(ts)}</span>
                  </div>
                  <div className="cr-last">{preview}</div>
                </div>
                {unread > 0 && (
                  <span className="nav-badge teal" style={{ marginLeft: 0 }}>{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
