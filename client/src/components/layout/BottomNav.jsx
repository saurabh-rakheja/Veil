import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

const API = import.meta.env.VITE_API_URL

const Ic = (d) => (p) => (
  <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
const IcoCompass = (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>
const IcoReq     = (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
const IcoInvite  = Ic("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71")
const IcoUser    = Ic("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z")

export default function BottomNav() {
  const { getToken } = useAuth()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchPending() {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/handshake/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setPending(Array.isArray(data) ? data.length : 0)
        }
      } catch { /* non-critical */ }
    }
    fetchPending()
    return () => { cancelled = true }
  }, [getToken])

  const NAV_ITEMS = [
    { to: '/',                     Icon: IcoCompass, label: 'Discover', end: true },
    { to: '/connections/requests', Icon: IcoReq,     label: 'Requests', end: false, badge: pending },
    { to: '/invites',              Icon: IcoInvite,  label: 'Invites',  end: false },
    { to: '/settings',             Icon: IcoUser,    label: 'Profile',  end: false },
  ]

  return (
    <nav aria-label="Main navigation" className="bottom-nav">
      {NAV_ITEMS.map(({ to, Icon, label, end, badge }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => `bnav-item${isActive ? ' active' : ''}`}
          aria-label={label}>
          {({ isActive }) => (
            <>
              <div className="bnav-icon-wrap">
                <Icon size={22}/>
                {badge > 0 && <span className="bnav-badge">{badge > 9 ? '9+' : badge}</span>}
              </div>
              <span className="bnav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
