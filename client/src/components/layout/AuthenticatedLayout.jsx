import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom'
import * as jdenticon from 'jdenticon'
import { useClerk, useAuth } from '@clerk/clerk-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotifications } from '../../context/NotificationContext'
import BottomNav from './BottomNav'

const API = import.meta.env.VITE_API_URL

/* ── Brand mark ── */
function LoomMark({ size = 34 }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="var(--surface-2)" stroke="var(--line-2)"/>
      <g strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M11 13c6 0 6 14 12 14s6-14 6-14" stroke="var(--teal)"/>
        <path d="M11 27c6 0 6-14 12-14s6 14 6 14" stroke="var(--gold)" opacity="0.92"/>
      </g>
      <circle cx="20" cy="20" r="2.1" fill="var(--surface-2)"/>
    </svg>
  )
}

/* ── User avatar ── */
function UserAvatar({ userId, size = 38 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current && userId) jdenticon.update(ref.current, userId) }, [userId])
  return <svg ref={ref} width={size} height={size} data-jdenticon-value={userId}
    style={{ borderRadius: '50%', display: 'block' }}/>
}

/* ── Icons ── */
const Ico = ({ d, size = 19, children }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d}/>}
  </svg>
)
const IcoCompass  = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></Ico>
const IcoChat     = (p) => <Ico {...p}><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-1L3 20l1-4a8.5 8.5 0 0 1-1-4 8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z"/></Ico>
const IcoReq      = (p) => <Ico {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></Ico>
const IcoBell     = (p) => <Ico {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></Ico>
const IcoSettings = (p) => <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09"/></Ico>
const IcoInvite   = (p) => <Ico {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Ico>
const IcoInfo     = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></Ico>
const IcoShield   = (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Ico>
const IcoSun      = (p) => <Ico {...p}><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/></Ico>
const IcoMoon     = (p) => <Ico {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></Ico>
const IcoChevrons = (p) => <Ico {...p}><path d="M11 6l-6 6 6 6M18 6l-6 6 6 6"/></Ico>
const IcoMenu     = (p) => <Ico {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Ico>

/* ── Route → page title/subtitle ── */
const PAGE_META = {
  '/':                     { t: 'Discover',            s: 'Browse verified people — privately, at your own pace' },
  '/discover':             { t: 'Discover',            s: 'Browse verified people — privately, at your own pace' },
  '/chats':                { t: 'Chats',               s: 'Encrypted conversations, unlocked by consent' },
  '/connections/requests': { t: 'Connection requests', s: 'Every connection begins with a mutual handshake' },
  '/notifications':        { t: 'Notifications',       s: 'What\'s happening across your trusted network' },
  '/invites':              { t: 'Invite links',        s: 'Grow the community through people you trust' },
  '/settings':             { t: 'Settings',            s: 'You control every layer of your visibility' },
  '/about':                { t: 'About Loom',          s: 'Why we built a platform where safety comes first' },
}
function pageMeta(path) {
  if (PAGE_META[path]) return PAGE_META[path]
  if (path.startsWith('/profile/')) return { t: 'Profile', s: '' }
  return { t: 'Loom', s: '' }
}

export default function AuthenticatedLayout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { signOut }  = useClerk()
  const { getToken } = useAuth()
  const { id: userId, username } = useCurrentUser()
  const { totalUnreadMessages } = useNotifications()

  const [navOpen,    setNavOpen]    = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [dark,       setDark]       = useState(true)
  const [notifCount, setNotifCount] = useState(0)
  const [pendingReq, setPendingReq] = useState(0)

  /* sync theme */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  /* unread notification count */
  useEffect(() => {
    if (!userId) return
    getToken().then(token => {
      if (!token) return
      fetch(`${API}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setNotifCount(d.count || 0))
        .catch(() => {})
    })
  }, [userId, getToken])

  /* pending handshake count */
  useEffect(() => {
    if (!userId) return
    getToken().then(token => {
      if (!token) return
      fetch(`${API}/api/handshake/pending`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(d => setPendingReq(Array.isArray(d) ? d.length : 0))
        .catch(() => {})
    })
  }, [userId, getToken])

  const meta = pageMeta(location.pathname)
  const go   = (to) => { navigate(to); setNavOpen(false) }

  const NAV_PRIMARY = [
    { to: '/',                     label: 'Discover',            Icon: IcoCompass },
    { to: '/chats',                label: 'Chats',               Icon: IcoChat,     badge: totalUnreadMessages, badgeTeal: true },
    { to: '/connections/requests', label: 'Connection requests', Icon: IcoReq,      badge: pendingReq },
    { to: '/notifications',        label: 'Notifications',       Icon: IcoBell,     badge: notifCount },
  ]
  const NAV_SECONDARY = [
    { to: '/invites',  label: 'Invite links', Icon: IcoInvite },
    { to: '/about',    label: 'About Loom',   Icon: IcoInfo   },
    { to: '/settings', label: 'Settings',     Icon: IcoSettings },
  ]

  function NavItem({ to, label, Icon, badge, badgeTeal }) {
    const active = to === '/'
      ? (location.pathname === '/' || location.pathname === '/discover')
      : location.pathname.startsWith(to)
    return (
      <a className={`nav-item${active ? ' active' : ''}`}
        onClick={() => go(to)} title={collapsed ? label : undefined} style={{ cursor: 'pointer' }}>
        <Icon size={19}/>
        <span className="nav-text">{label}</span>
        {badge > 0 && <span className={`nav-badge${badgeTeal ? ' teal' : ''}`}>{badge > 99 ? '99+' : badge}</span>}
      </a>
    )
  }

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          <LoomMark/>
          <span className="brand-name">loom</span>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IcoChevrons size={18}/>
          </button>
        </div>

        <div className="nav">
          {NAV_PRIMARY.map(item => <NavItem key={item.to} {...item}/>)}
          <div className="nav-label">Your network</div>
          {NAV_SECONDARY.map(item => <NavItem key={item.to} {...item}/>)}
        </div>

        <div className="protect-card" style={{ marginTop: 18, padding: '14px 14px 16px',
          borderRadius: 'var(--r-lg)', background: 'var(--teal-dim)', border: '1px solid var(--teal-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--teal-bright)',
            fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
            <IcoShield size={16}/> Protected by design
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
            No one can message you without a mutual consent handshake. Always.
          </p>
        </div>

        <div className="sidebar-foot">
          <div className="theme-toggle">
            <button className={!dark ? 'on' : ''} onClick={() => setDark(false)} title="Light">
              <IcoSun size={15}/> <span className="tt-label">Light</span>
            </button>
            <button className={dark ? 'on' : ''} onClick={() => setDark(true)} title="Dark">
              <IcoMoon size={15}/> <span className="tt-label">Dark</span>
            </button>
          </div>
          <a className="me-chip" onClick={() => go('/settings')} style={{ cursor: 'pointer' }}
            title={collapsed ? 'Settings' : undefined}>
            <UserAvatar userId={userId} size={38}/>
            <div className="meta">
              <div className="nm">{username}</div>
              <div className="st" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>Connected</div>
            </div>
          </a>
        </div>
      </aside>

      {/* Mobile scrim */}
      <div className="scrim" onClick={() => setNavOpen(false)}/>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-btn" onClick={() => setNavOpen(v => !v)} aria-label="Menu">
            <IcoMenu size={20}/>
          </button>
          <div>
            <h1>{meta.t}</h1>
            {meta.s && <div className="sub">{meta.s}</div>}
          </div>
          <div className="spacer"/>
          {(location.pathname === '/' || location.pathname === '/discover') && (
            <button className="btn btn-ghost btn-sm" onClick={() => go('/invites')}>
              <IcoInvite size={16}/> Invite
            </button>
          )}
        </header>

        {/* Chats gets full-height, no scroll wrapper */}
        {location.pathname === '/chats' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
            <Outlet/>
          </div>
        ) : (
          <div className="scroll"><Outlet/></div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
