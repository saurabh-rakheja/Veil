import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import * as jdenticon from 'jdenticon'
import { useSocket }        from '../../context/SocketContext'
import { useCurrentUser }   from '../../hooks/useCurrentUser'
import { useNotifications } from '../../context/NotificationContext'

const API = import.meta.env.VITE_API_URL

/* ── Icons ── */
const Ico = ({ d, size = 18, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children || <path d={d}/>}</svg>
)
const IcoSearch  = (p) => <Ico {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ico>
const IcoSend    = (p) => <Ico {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></Ico>
const IcoLock    = (p) => <Ico {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Ico>
const IcoShield  = (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Ico>
const IcoPin     = (p) => <Ico {...p}><path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3z"/></Ico>
const IcoMore    = (p) => <Ico {...p}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></Ico>
const IcoFlag    = (p) => <Ico {...p}><path d="M4 22V4M4 4l8-2v11l-8 2M12 2l8 2v11l-8-2"/></Ico>
const IcoBlock   = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></Ico>
const IcoUnblock = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></Ico>
const IcoHandshake=(p) => <Ico {...p}><path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/></Ico>
const IcoPhone   = (p) => <Ico {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></Ico>
const IcoClock   = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>
const IcoCheck   = (p) => <Ico {...p}><path d="M20 6L9 17l-5-5"/></Ico>
const IcoChat    = (p) => <Ico {...p}><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-1L3 20l1-4a8.5 8.5 0 0 1-1-4 8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z"/></Ico>
const IcoImage   = (p) => <Ico {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5-5L5 21"/></Ico>

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d)
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24)
  if (m < 1) return 'now'; if (m < 60) return `${m}m`; if (h < 24) return `${h}h`
  if (dy < 7) return `${dy}d`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function formatTime(d) { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
function formatDay(d) {
  const date = new Date(d), diff = Math.floor((Date.now()-date)/86400000)
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month:'long', day:'numeric' })
}
function isSameDay(a, b) {
  const da=new Date(a),db=new Date(b)
  return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate()
}

/* ── Avatar ── */
function ConvAvatar({ userId, size = 46 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current && userId) jdenticon.update(ref.current, userId) }, [userId])
  return <svg ref={ref} width={size} height={size} data-jdenticon-value={userId}
    style={{ borderRadius: '50%', flexShrink: 0 }}/>
}

/* ── Thread dropdown menu ── */
function ThreadMenu({ pinned, onPin, onBlock, onReport }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn-icon" onClick={() => setOpen(o => !o)} title="More"><IcoMore size={18}/></button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)}/>
          <div className="menu">
            <button className="menu-item" onClick={() => { onPin(); setOpen(false) }}>
              <IcoPin size={16}/> {pinned ? 'Unpin chat' : 'Pin chat'}
            </button>
            <button className="menu-item" onClick={() => { onReport(); setOpen(false) }}>
              <IcoFlag size={16}/> Report
            </button>
            <div className="menu-sep"/>
            <button className="menu-item danger" onClick={() => { onBlock(); setOpen(false) }}>
              <IcoBlock size={16}/> Block user
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Thread (right panel) ── */
function Thread({ conv, pinned, onPin, onBlock, onToast, onClose }) {
  const { getToken }          = useAuth()
  const { id: myId }          = useCurrentUser()
  const socket                = useSocket()
  const { setActiveConversation } = useNotifications()
  const roomId = `conn_${conv.connectionId}`

  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [input,    setInput]    = useState('')
  const inputRef  = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    setActiveConversation(conv.connectionId)
    async function init() {
      try {
        const token = await getToken()
        const res = await fetch(`${API}/api/messages/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) { const d = await res.json(); setMessages(d.messages || []) }
        await fetch(`${API}/api/messages/${conv.connectionId}/read`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
        })
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    init()
    return () => setActiveConversation(null)
  }, [conv.connectionId, roomId, getToken, setActiveConversation])

  useEffect(() => {
    if (!socket) return
    socket.emit('join_room', roomId)
    function onMsg(msg) {
      if (msg.conversationId !== conv.connectionId) return
      setMessages(prev => {
        if (msg._id && prev.some(m => String(m._id) === String(msg._id))) return prev
        return [...prev, { _id: msg._id || `tmp_${Date.now()}`, sender: msg.sender, content: msg.content, createdAt: msg.time || new Date().toISOString() }]
      })
    }
    socket.on('receive_message', onMsg)
    return () => { socket.off('receive_message', onMsg); socket.emit('leave_room', roomId) }
  }, [socket, roomId, conv.connectionId])

  useEffect(() => { if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || !myId) return
    const tempId = `tmp_${Date.now()}`
    setMessages(p => [...p, { _id: tempId, sender: myId, content: text, createdAt: new Date().toISOString() }])
    setInput(''); inputRef.current?.focus()
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: conv.connectionId, content: text, recipientId: conv.otherUserId }),
      })
      if (!res.ok) throw new Error()
      const { message } = await res.json()
      setMessages(p => p.map(m => m._id === tempId ? { ...m, _id: String(message._id) } : m))
    } catch {
      setMessages(p => p.filter(m => m._id !== tempId))
      onToast('Failed to send. Please try again.')
    }
  }

  /* build rows with day separators */
  const rows = []
  messages.forEach((msg, i) => {
    const prev = messages[i - 1]
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt))
      rows.push({ type: 'sep', key: `sep_${i}`, label: formatDay(msg.createdAt) })
    rows.push({ type: 'msg', key: msg._id || `m_${i}`, msg })
  })

  return (
    <div className="thread">
      <div className="thread-head">
        <ConvAvatar userId={conv.otherUserId} size={42}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="cr-alias" style={{ fontSize: 16 }}>{conv.displayName || 'Anonymous'}</span>
            {pinned && <span className="chip sm" style={{ color: 'var(--gold)' }}><IcoPin size={11}/> Pinned</span>}
          </div>
          {conv.otherUserId && (
            <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600 }}>
              {conv.isOnline ? 'Online now' : 'Last seen recently'}
            </span>
          )}
        </div>
        <button className="btn-icon" title="Voice call"><IcoPhone size={18}/></button>
        <button className="btn-icon" title="Safety & trust"><IcoShield size={18}/></button>
        <ThreadMenu pinned={pinned} onPin={onPin}
          onBlock={() => { onBlock(conv.otherUserId, conv.displayName); }}
          onReport={() => onToast('Report submitted to moderators')}/>
      </div>

      <div className="thread-body">
        <div className="thread-gate">
          <IcoHandshake size={15}/> Consent handshake completed · messaging is open · end-to-end encrypted
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="mini-spin"/></div>
        ) : (
          <>
            {rows.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-lo)', fontSize: 14 }}>
                You're connected. Say hello.
              </div>
            )}
            {rows.map(row => {
              if (row.type === 'sep') return (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', alignSelf: 'stretch' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
                  <span style={{ fontSize: 11.5, color: 'var(--text-lo)', fontWeight: 700 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
                </div>
              )
              const { msg } = row
              const mine = msg.sender === myId
              return (
                <div key={row.key} className={`bubble-row ${mine ? 'me' : 'them'}`}>
                  <div className={`bubble ${mine ? 'me' : 'them'}`}>{msg.content}</div>
                  <span className="bubble-t">{formatTime(msg.createdAt)}</span>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      <div className="composer">
        <button className="btn-icon" style={{ flexShrink: 0 }}><IcoImage size={18}/></button>
        <input ref={inputRef} className="composer-input"
          placeholder={`Message ${conv.displayName || 'Anonymous'}…`}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}/>
        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, width: 42, padding: 0, height: 42, borderRadius: 99 }}
          onClick={send} disabled={!input.trim()} aria-label="Send">
          <IcoSend size={17}/>
        </button>
      </div>
    </div>
  )
}

/* ── Pending (locked) thread ── */
function PendingThread({ displayName }) {
  return (
    <div className="thread">
      <div className="thread-body" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="locked-convo">
          <div className="lc-icon"><IcoLock size={26}/></div>
          <h3 style={{ fontSize: 18 }}>Messaging is locked until you both agree</h3>
          <p className="muted" style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.55, margin: '8px auto 0' }}>
            You sent {displayName || 'this person'} a consent request. The moment they accept, an encrypted conversation opens here — and not a second before.
          </p>
          <div className="lc-steps">
            <div className="lc-step done"><IcoCheck size={14}/> You requested</div>
            <div className="lc-bar"/>
            <div className="lc-step wait"><span className="mini-spin" style={{ width: 13, height: 13 }}/> Awaiting them</div>
            <div className="lc-bar"/>
            <div className="lc-step"><IcoChat size={14}/> Chat opens</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Blocked view ── */
function BlockedView({ blocked, onUnblock }) {
  if (!blocked.length) return (
    <div className="thread">
      <div className="thread-body" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="locked-convo">
          <div className="lc-icon" style={{ background: 'var(--teal-dim)', color: 'var(--teal)', borderColor: 'var(--teal-line)' }}>
            <IcoShield size={26}/>
          </div>
          <h3 style={{ fontSize: 18 }}>No one is blocked</h3>
          <p className="muted" style={{ fontSize: 14, maxWidth: 360, margin: '8px auto 0', lineHeight: 1.55 }}>
            Anyone you block disappears completely — they can't see you, message you, or know they were blocked.
          </p>
        </div>
      </div>
    </div>
  )
  return (
    <div className="thread">
      <div className="thread-head">
        <h3 style={{ fontSize: 17 }}>Blocked members</h3>
        <div style={{ flex: 1 }}/>
        <span className="chip sm">{blocked.length}</span>
      </div>
      <div className="thread-body" style={{ gap: 10, overflowY: 'auto' }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
          Blocked members can't see your profile, reach you, or tell that they were blocked. Unblock anytime.
        </p>
        {blocked.map(b => (
          <div key={b.blockedUserId} className="blocked-row">
            <ConvAvatar userId={b.blockedUserId} size={42}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cr-alias">{b.blockedUserDisplayName || b.blockedUserId?.slice(0, 12) + '…'}</div>
              <span style={{ fontSize: 12, color: 'var(--text-lo)' }}>Blocked</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onUnblock(b.blockedUserId)}>
              <IcoUnblock size={15}/> Unblock
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ChatsPage ── */
export default function ChatsPage() {
  const { getToken } = useAuth()
  const navigate     = useNavigate()

  const [view,          setView]          = useState('chats')   // 'chats' | 'blocked'
  const [conversations, setConversations] = useState([])
  const [pending,       setPending]       = useState([])
  const [blocked,       setBlocked]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [sel,           setSel]           = useState(null)      // selected conv or pending id
  const [pinned,        setPinned]        = useState([])
  const [searchQ,       setSearchQ]       = useState('')
  const [toast,         setToast]         = useState(null)

  /* load data */
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [convsRes, pendRes, blockRes] = await Promise.all([
          fetch(`${API}/api/messages/conversations`,  { headers }),
          fetch(`${API}/api/handshake/pending`,        { headers }),
          fetch(`${API}/api/reports/block`,            { headers }),
        ])
        if (convsRes.ok) { const d = await convsRes.json(); setConversations(d.conversations || []) }
        if (pendRes.ok)  { const d = await pendRes.json();  setPending(Array.isArray(d) ? d : []) }
        if (blockRes.ok) { const d = await blockRes.json(); setBlocked(Array.isArray(d) ? d : []) }
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    load()
  }, [getToken])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3200) }

  async function unblockUser(blockedUserId) {
    try {
      const token = await getToken()
      await fetch(`${API}/api/reports/block/${blockedUserId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setBlocked(p => p.filter(b => b.blockedUserId !== blockedUserId))
      showToast('User unblocked')
    } catch { /* non-critical */ }
  }

  async function blockUser(otherUserId, displayName) {
    try {
      const token = await getToken()
      await fetch(`${API}/api/reports/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blockedUserId: otherUserId }),
      })
      setConversations(p => p.filter(c => c.otherUserId !== otherUserId))
      setSel(null)
      showToast(`${displayName || 'User'} blocked`)
    } catch { /* non-critical */ }
  }

  const togglePin = (id) => setPinned(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const filtered = conversations.filter(c =>
    !searchQ || (c.displayName || '').toLowerCase().includes(searchQ.toLowerCase())
  )
  const pinnedConvos = filtered.filter(c => pinned.includes(c.connectionId))
  const otherConvos  = filtered.filter(c => !pinned.includes(c.connectionId))
  const blockedIds   = new Set(blocked.map(b => b.blockedUserId))

  /* active conversation object */
  const activePending = sel?.startsWith?.('p_') ? pending.find(p => p._id === sel.slice(2)) : null
  const activeConv    = !activePending && sel ? conversations.find(c => c.connectionId === sel) : null

  function renderConvoRow(c) {
    const isActive = sel === c.connectionId
    const isPinned = pinned.includes(c.connectionId)
    return (
      <a key={c.connectionId} className={`convo-row${isActive ? ' active' : ''}`}
        onClick={() => setSel(c.connectionId)} style={{ cursor: 'pointer' }}>
        <ConvAvatar userId={c.otherUserId} size={46}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <span className="cr-alias">{c.displayName || 'Anonymous'}</span>
            <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600, flexShrink: 0 }}>
              {timeAgo(c.lastMessage?.createdAt || c.connectedAt)}
            </span>
          </div>
          <div className="cr-last">
            {c.lastMessage?.content
              ? (c.lastMessage.content.length > 40 ? c.lastMessage.content.slice(0,40)+'…' : c.lastMessage.content)
              : 'Say hello'}
          </div>
        </div>
        {c.unread > 0 && <span className="nav-badge teal" style={{ marginLeft: 0 }}>{c.unread}</span>}
        <button className={`pin-btn${isPinned ? ' on' : ''}`} title={isPinned ? 'Unpin' : 'Pin'}
          onClick={e => { e.stopPropagation(); togglePin(c.connectionId) }}>
          <IcoPin size={15}/>
        </button>
      </a>
    )
  }

  return (
    <div className="chats-wrap" style={{ width: '100%' }}>
      {/* ── Left: conversation list ── */}
      <div className="convo-list">
        <div className="convo-search">
          <div className="seg" style={{ width: '100%', marginBottom: 10 }}>
            <button className={`seg-btn${view === 'chats' ? ' on' : ''}`} style={{ flex: 1 }} onClick={() => setView('chats')}>Chats</button>
            <button className={`seg-btn${view === 'blocked' ? ' on' : ''}`} style={{ flex: 1 }} onClick={() => setView('blocked')}>
              Blocked{blocked.length ? ` · ${blocked.length}` : ''}
            </button>
          </div>
          <div className="search" style={{ width: '100%' }}>
            <IcoSearch size={17}/>
            <input placeholder="Search connections…" value={searchQ} onChange={e => setSearchQ(e.target.value)}/>
          </div>
        </div>

        <div className="convo-scroll">
          {view === 'blocked' ? (
            blocked.length ? blocked.map(b => (
              <div key={b.blockedUserId} className="convo-row" style={{ cursor: 'default' }}>
                <ConvAvatar userId={b.blockedUserId} size={46}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cr-alias">{b.blockedUserDisplayName || b.blockedUserId?.slice(0,12)+'…'}</div>
                  <div className="cr-last">Blocked</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => unblockUser(b.blockedUserId)}>
                  <IcoUnblock size={14}/>
                </button>
              </div>
            )) : <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-lo)', fontSize: 13 }}>No blocked members</div>
          ) : loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="mini-spin"/></div>
          ) : (
            <>
              {/* Pending handshakes */}
              {pending.map(p => (
                <a key={p._id} className={`convo-row pending${sel === `p_${p._id}` ? ' active' : ''}`}
                  onClick={() => setSel(`p_${p._id}`)} style={{ cursor: 'pointer' }}>
                  <ConvAvatar userId={p.initiatorId} size={46}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cr-alias">{p.displayName || 'Anonymous'}</div>
                    <div className="cr-last" style={{ color: 'var(--gold)' }}>
                      <IcoClock size={12} style={{ verticalAlign: '-2px' }}/> Awaiting their consent
                    </div>
                  </div>
                </a>
              ))}

              {/* Pinned */}
              {pinnedConvos.length > 0 && <div className="convo-divider"><IcoPin size={11}/> Pinned</div>}
              {pinnedConvos.map(renderConvoRow)}
              {pinnedConvos.length > 0 && otherConvos.length > 0 && <div className="convo-divider">All chats</div>}
              {otherConvos.map(renderConvoRow)}

              {!loading && conversations.length === 0 && pending.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-lo)', fontSize: 13.5 }}>
                  <IcoChat size={28} style={{ marginBottom: 10, opacity: .4 }}/>
                  <p style={{ marginBottom: 6, fontWeight: 700, color: 'var(--text-hi)' }}>No conversations yet</p>
                  <p>Send a connection request to start chatting.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right: thread / blocked view ── */}
      {view === 'blocked' ? (
        <BlockedView blocked={blocked} onUnblock={unblockUser}/>
      ) : activePending ? (
        <PendingThread displayName={activePending.displayName}/>
      ) : activeConv ? (
        <Thread
          key={activeConv.connectionId}
          conv={activeConv}
          pinned={pinned.includes(activeConv.connectionId)}
          onPin={() => togglePin(activeConv.connectionId)}
          onBlock={blockUser}
          onToast={showToast}/>
      ) : (
        <div className="thread">
          <div className="thread-body" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="locked-convo">
              <div className="lc-icon" style={{ background: 'var(--teal-dim)', color: 'var(--teal)', borderColor: 'var(--teal-line)' }}>
                <IcoHandshake size={26}/>
              </div>
              <h3 style={{ fontSize: 18 }}>Select a conversation</h3>
              <p className="muted" style={{ fontSize: 14, maxWidth: 360, margin: '8px auto 0', lineHeight: 1.55 }}>
                Choose a connection from the left to start chatting. Every conversation here began with mutual consent.
              </p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-wrap" style={{ position: 'absolute' }}>
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  )
}
