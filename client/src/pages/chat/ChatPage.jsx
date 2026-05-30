import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSocket }        from '../../context/SocketContext'
import { useCurrentUser }   from '../../hooks/useCurrentUser'
import { useNotifications } from '../../context/NotificationContext'
import ConsentMiniCard  from '../../components/chat/ConsentMiniCard'
import ReportModal      from '../../components/reporting/ReportModal'
import UserDetailModal  from '../../components/chat/UserDetailModal'

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function formatDay(d) {
  const date = new Date(d), now = new Date()
  const diff = Math.floor((now - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export default function ChatPage() {
  const { connectionId } = useParams()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const { getToken }     = useAuth()
  const { id: myUserId }          = useCurrentUser()
  const socket                    = useSocket()
  const { setActiveConversation } = useNotifications()
  const roomId  = `conn_${connectionId}`
  const e2eKey  = `e2eNotice_dismissed_${connectionId}`

  const [connection,   setConnection]   = useState(null)
  const [messages,     setMessages]     = useState([])
  const [msgLoading,   setMsgLoading]   = useState(true)
  const [input,        setInput]        = useState('')
  const [e2eVisible,   setE2eVisible]   = useState(() => localStorage.getItem(e2eKey) !== 'true')
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [unmatchOpen,  setUnmatchOpen]  = useState(false)
  const [unmatching,   setUnmatching]   = useState(false)
  const [reportOpen,   setReportOpen]   = useState(false)
  const [showUserDetail, setShowUserDetail] = useState(false)
  const [toast,        setToast]        = useState(null)

  const inputRef  = useRef(null)
  const bottomRef = useRef(null)
  const menuRef   = useRef(null)

  // Fetch connection + messages
  useEffect(() => {
    async function init() {
      try {
        const token   = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [connsRes, msgsRes] = await Promise.all([
          fetch('/api/connections/mine', { headers }),
          fetch(`/api/messages/${roomId}`, { headers }),
        ])
        if (connsRes.ok) {
          const { connections } = await connsRes.json()
          const found = (connections || []).find(c => c.connectionId === connectionId)
          setConnection(found || null)
        }
        if (msgsRes.ok) {
          const { messages: msgs } = await msgsRes.json()
          setMessages(msgs || [])
        }
      } catch (err) { console.error('[ChatPage] init error:', err) }
      finally { setMsgLoading(false) }
    }
    if (connectionId) init()
  }, [connectionId, getToken, roomId])

  // Mark active + read
  useEffect(() => {
    if (!connectionId) return
    setActiveConversation(connectionId)
    const markRead = async () => {
      try {
        const token = await getToken()
        await fetch(`/api/messages/${connectionId}/read`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
        })
      } catch (e) { console.error('[Chat] mark read:', e) }
    }
    markRead()
    return () => setActiveConversation(null)
  }, [connectionId, setActiveConversation]) // eslint-disable-line

  // Dismiss E2E notice
  useEffect(() => {
    if (e2eVisible) {
      const t = setTimeout(() => { localStorage.setItem(e2eKey, 'true'); setE2eVisible(false) }, 4000)
      return () => clearTimeout(t)
    }
  }, [e2eKey, e2eVisible])

  // Socket.io
  useEffect(() => {
    if (!socket) return
    socket.emit('join_room', roomId)
    function onMessage(msg) {
      if (msg.conversationId !== connectionId) return
      setMessages(prev => {
        if (msg._id && prev.some(m => String(m._id) === String(msg._id))) return prev
        return [...prev, { _id: msg._id || `tmp_${Date.now()}`, sender: msg.sender, content: msg.content, createdAt: msg.time || new Date().toISOString(), room: roomId }]
      })
    }
    socket.on('receive_message', onMessage)
    return () => { socket.off('receive_message', onMessage); socket.emit('leave_room', roomId) }
  }, [socket, roomId])

  // Auto-scroll
  useEffect(() => {
    if (!msgLoading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, msgLoading])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  async function sendMessage() {
    const text = input.trim()
    if (!text || !myUserId) return
    const recipientId = searchParams.get('recipientId') || connection?.otherUserId
    const tempId = `tmp_${Date.now()}`
    setMessages(prev => [...prev, { _id: tempId, sender: myUserId, content: text, createdAt: new Date().toISOString(), room: roomId }])
    setInput(''); inputRef.current?.focus()
    try {
      const token = await getToken()
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: connectionId, content: text, recipientId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { message } = await res.json()
      setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: String(message._id) } : m))
    } catch (err) {
      console.error('[Chat] send failed:', err)
      setMessages(prev => prev.filter(m => m._id !== tempId))
      showToast('Failed to send. Please try again.')
    }
  }

  function showToast(msg, dur = 3000) { setToast(msg); setTimeout(() => setToast(null), dur) }

  const handleBlock = useCallback(async () => {
    if (!connection?.otherUserId) return
    setMenuOpen(false)
    try {
      const token = await getToken()
      await fetch('/api/reports/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blockedUserId: connection.otherUserId }),
      })
      showToast(`${connection.displayName || 'User'} has been blocked.`)
      setTimeout(() => navigate('/', { replace: true }), 800)
    } catch (err) { console.error('[ChatPage] block error:', err) }
  }, [connection, getToken, navigate])

  const handleUnmatch = useCallback(async () => {
    setUnmatching(true)
    try {
      const token = await getToken()
      await fetch(`/api/connections/${connectionId}/unmatch`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      setUnmatchOpen(false)
      showToast(`You've unmatched with ${connection?.displayName || 'this person'}.`)
      setTimeout(() => navigate('/', { replace: true }), 800)
    } catch (err) { console.error('[ChatPage] unmatch error:', err) }
    finally { setUnmatching(false) }
  }, [connectionId, connection, getToken, navigate])

  const otherName = connection?.displayName || 'Anonymous'
  const tier      = connection?.verificationTier

  const rows = []
  messages.forEach((msg, i) => {
    const prev = messages[i - 1]
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt))
      rows.push({ type: 'sep', key: `sep_${i}`, label: formatDay(msg.createdAt) })
    rows.push({ type: 'msg', key: msg._id || `m_${i}`, msg })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--surface-0)' }}>
      {/* Header */}
      <header className="topbar" style={{ flexShrink: 0 }}>
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h1 style={{ fontSize: 18, cursor: 'pointer' }}
              onClick={() => connection?.otherUserId && setShowUserDetail(true)}
              role="button" tabIndex={0}>
              {otherName}
            </h1>
            {(tier === 'phone_verified' || tier === 'id_verified') && (
              <span className="badge-verify" style={{ fontSize: 11 }}>✓ Verified</span>
            )}
          </div>
        </div>
        <button className="btn-icon" onClick={() => connection?.otherUserId && navigate(`/profile/${connection.otherUserId}`)} aria-label="View profile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>
        </button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="btn-icon" onClick={() => setMenuOpen(v => !v)} aria-label="More">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)}/>
              <div className="menu">
                {connection?.otherUserId && (
                  <button className="menu-item" onClick={() => { setMenuOpen(false); navigate(`/profile/${connection.otherUserId}`) }}>View profile</button>
                )}
                <div className="menu-sep"/>
                <button className="menu-item danger" onClick={handleBlock}>Block</button>
                <button className="menu-item danger" onClick={() => { setMenuOpen(false); setUnmatchOpen(true) }}>Unmatch</button>
                <button className="menu-item" onClick={() => { setMenuOpen(false); setReportOpen(true) }}>Report</button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="thread-body" style={{ flex: 1, overflowY: 'auto' }}>
        <ConsentMiniCard connectionId={connectionId}/>
        {e2eVisible && (
          <div className="thread-gate" style={{ margin: '0 auto 16px' }}>
            🔒 Messages are end-to-end encrypted
          </div>
        )}
        {msgLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span className="mini-spin"/>
          </div>
        ) : (
          <>
            {rows.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <span style={{ fontSize: 14, color: 'var(--text-lo)' }}>You're now connected. Say hello.</span>
              </div>
            )}
            {rows.map(row => {
              if (row.type === 'sep') return (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', padding: '0 22px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
                  <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 700 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
                </div>
              )
              const { msg } = row
              const isMine = msg.sender === myUserId
              return (
                <div key={row.key} className={`bubble-row ${isMine ? 'me' : 'them'}`}>
                  <div className={`bubble ${isMine ? 'me' : 'them'}`}>{msg.content}</div>
                  <span className="bubble-t">{formatTime(msg.createdAt)}</span>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="composer" style={{ flexShrink: 0 }}>
        <textarea ref={inputRef} className="composer-input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder={`Message ${otherName}…`} rows={1} maxLength={2000}
          style={{ resize: 'none' }}/>
        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, width: 42, padding: 0, height: 42, borderRadius: 99 }}
          onClick={sendMessage} disabled={!input.trim()} aria-label="Send">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
        </button>
      </div>

      {/* Unmatch modal */}
      {unmatchOpen && (
        <div className="modal-scrim" onClick={() => !unmatching && setUnmatchOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3 style={{ fontSize: 18 }}>Unmatch?</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                This removes your connection with {otherName}. Neither of you will be notified.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-quiet" style={{ flex: 1 }} onClick={() => !unmatching && setUnmatchOpen(false)} disabled={unmatching}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleUnmatch} disabled={unmatching}>
                {unmatching ? 'Unmatching…' : 'Unmatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {connection?.otherUserId && (
        <ReportModal open={reportOpen} onOpenChange={setReportOpen}
          reportedUserId={connection.otherUserId} contentType="profile"/>
      )}

      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}

      {showUserDetail && connection?.otherUserId && (
        <UserDetailModal userId={connection.otherUserId}
          onClose={() => setShowUserDetail(false)}
          onReport={() => { setShowUserDetail(false); setReportOpen(true) }}/>
      )}
    </div>
  )
}
