import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useInView } from 'react-intersection-observer'
import ProfileCard from '../../components/discovery/ProfileCard'
import ProfilePopup from '../../components/discovery/ProfilePopup'
import FilterPanel from '../../components/discovery/FilterPanel'
import ProfileCompletenessBar from '../../components/profile/ProfileCompletenessBar'

const DEFAULT_FILTERS = {
  city: '', experienceLevel: [], lookingFor: [], minCompatibility: 0,
}

function buildParams(filters, cursor) {
  const p = new URLSearchParams()
  if (cursor) p.set('cursor', cursor)
  if (filters.city) p.set('city', filters.city)
  if (filters.minCompatibility > 0) p.set('minCompatibility', filters.minCompatibility)
  if (filters.experienceLevel?.length > 0 && filters.experienceLevel.length < 4)
    p.set('experienceLevel', filters.experienceLevel.join(','))
  if (filters.lookingFor?.length > 0 && filters.lookingFor.length < 6)
    p.set('lookingFor', filters.lookingFor.join(','))
  return p.toString()
}

/* Shimmer skeleton — matches design exactly */
function CardSkeleton() {
  return (
    <div className="card disc-card">
      <div className="disc-media sk" style={{ borderRadius: 0 }}/>
      <div style={{ padding: '16px 16px 18px' }}>
        <div className="sk sk-line" style={{ width: '55%', height: 15, marginBottom: 10 }}/>
        <div className="sk sk-line" style={{ width: '38%', marginBottom: 16 }}/>
        <div className="sk sk-line" style={{ width: '100%', marginBottom: 8 }}/>
        <div className="sk sk-line" style={{ width: '82%', marginBottom: 16 }}/>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div className="sk sk-line" style={{ width: 64, height: 22, borderRadius: 99 }}/>
          <div className="sk sk-line" style={{ width: 80, height: 22, borderRadius: 99 }}/>
        </div>
        <div className="sk sk-line" style={{ width: '100%', height: 40, borderRadius: 99 }}/>
      </div>
    </div>
  )
}

export default function DiscoveryPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor,  setNextCursor]  = useState(null)
  const [filters,     setFilters]     = useState(DEFAULT_FILTERS)
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [openUser,    setOpenUser]    = useState(null)    // user whose popup is open

  const fetchingRef = useRef(false)
  const { ref: sentinelRef, inView } = useInView({ rootMargin: '300px', threshold: 0 })

  const fetchPage = useCallback(async (cursor = null, append = false) => {
    if (!isLoaded || !isSignedIn) return
    if (fetchingRef.current && !append) return
    fetchingRef.current = true
    if (append) setLoadingMore(true)
    else        setLoading(true)
    const done = (ok = true) => {
      fetchingRef.current = false
      if (!ok) return
      if (append) setLoadingMore(false)
      else        setLoading(false)
    }
    try {
      const token = await getToken()
      if (!token) { done(false); return }
      const params = buildParams(filters, cursor)
      const res = await fetch(`/api/discovery${params ? `?${params}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { done(false); return }
      if (!res.ok) { done(); return }
      const data = await res.json()
      setUsers(prev => append ? [...prev, ...(data.cards ?? [])] : (data.cards ?? []))
      setNextCursor(data.nextCursor ?? null)
      done()
    } catch (err) {
      console.error('Discovery fetch failed:', err)
      done()
    }
  }, [isLoaded, isSignedIn, filters, getToken])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    setUsers([]); setNextCursor(null); fetchPage()
  }, [filters, isLoaded, isSignedIn])

  useEffect(() => {
    if (inView && nextCursor && !loadingMore) fetchPage(nextCursor, true)
  }, [inView, nextCursor, loadingMore])

  const hasFilters = filters.city || filters.minCompatibility > 0 ||
    (filters.experienceLevel?.length > 0 && filters.experienceLevel.length < 4) ||
    (filters.lookingFor?.length > 0 && filters.lookingFor.length < 6)

  function handleOpen(user)       { setOpenUser(user) }
  function handleClose()          { setOpenUser(null) }
  /* Remove card from the list immediately after a successful request */
  function handleRequestSent(uid) {
    setUsers(prev => prev.filter(u => u.userId !== uid))
    setOpenUser(null)
  }

  return (
    <div className="page">

      {/* ── Hero section (exact design) ── */}
      <div className="disc-hero">
        <div>
          <h2 style={{ fontSize: 27, marginBottom: 6 }}>Discover people, at your pace</h2>
          <p className="muted" style={{ fontSize: 14.5, maxWidth: 560, lineHeight: 1.55 }}>
            Everyone here is a verified adult. Browse freely — no one sees that you looked,
            and no one can reach you without a mutual consent handshake.
          </p>
        </div>
        <div className="hero-stat">
          <div className="hs-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            100% verified adults
          </div>
          <div className="hs-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
            </svg>
            Browsing is invisible
          </div>
          <div className="hs-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/>
            </svg>
            Consent before contact
          </div>
        </div>
      </div>

      <ProfileCompletenessBar/>

      {/* ── Filter bar ── */}
      <div className="filterbar">
        <div className="search" style={{ flex: '1 1 240px', maxWidth: 340 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input placeholder="Search interests, cities, aliases…" value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}/>
        </div>
        <button className={'toggle-chip' + (hasFilters ? ' on' : '')} onClick={() => setFilterOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
          </svg>
          {hasFilters ? 'Filters active' : 'More filters'}
        </button>
      </div>

      {/* ── Status row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px 18px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600 }}>
          {loading ? 'Finding people who match your limits…' : `${users.length} people match your filters`}
        </span>
        {loading && <span className="mini-spin"/>}
      </div>

      {/* ── Cards grid ── */}
      <div className="disc-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i}/>)
          : users.map((u, i) => (
              <ProfileCard
                key={u.userId}
                user={u}
                index={i}
                onOpen={handleOpen}
              />
            ))
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && users.length === 0 && (
        <div className="empty">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>
          </svg>
          <p>No one matches those filters yet.</p>
          <span>Loom grows slowly and deliberately — try widening your search.</span>
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }}/>
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <span className="mini-spin"/>
        </div>
      )}

      {/* ── Profile popup (opens on card click) ── */}
      {openUser && (
        <ProfilePopup
          user={openUser}
          onClose={handleClose}
          onRequestSent={handleRequestSent}
        />
      )}

      {filterOpen && (
        <FilterPanel filters={filters} onApply={setFilters} onClose={() => setFilterOpen(false)}/>
      )}
    </div>
  )
}
