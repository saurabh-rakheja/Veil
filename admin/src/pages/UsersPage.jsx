import { useState, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, ShieldAlert, ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('loom_admin_token')}` }
}

function StatusChip({ user }) {
  if (user.isBanned)           return <span className="status-banned">Banned</span>
  if (user.isSuspendedPending) return <span className="status-suspended">Auto-suspended</span>
  if (user.suspendedUntil && new Date(user.suspendedUntil) > Date.now())
                               return <span className="status-suspended">Suspended</span>
  return <span className="status-ok">Active</span>
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const ACTIONS = [
  { key: 'warn',          label: 'Warn',           cls: 'btn-warn'    },
  { key: 'suspend_7d',    label: 'Suspend 7 days', cls: 'btn-suspend' },
  { key: 'permanent_ban', label: 'Permanent ban',  cls: 'btn-ban'     },
]

const CATEGORY_LABELS = {
  fake_or_bot:       'Fake or bot',
  harassment:        'Harassment',
  consent_violation: 'Consent violation',
  illegal_content:   'Illegal content',
  underage_concern:  'Underage concern',
  spam:              'Spam',
  other:             'Other',
}

function UserDetailPanel({ userId, onClose }) {
  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [pendingAction,  setPendingAction]  = useState(null)
  const [notes,          setNotes]          = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [toast,          setToast]          = useState('')

  useState(() => {
    fetch(`/api/admin/users/${userId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  async function submitAction(key) {
    if (!data?.openReportId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/admin/${data.openReportId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({ action: key, moderatorNotes: notes }),
      })
      if (!res.ok) throw new Error()
      setToast('Action applied.')
      setTimeout(() => { setToast(''); onClose() }, 1500)
    } catch {
      setToast('Action failed. Please try again.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #7C3AED', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
    </div>
  )

  if (!data) return <div style={{ padding: 16, color: '#6B5FA6', fontSize: 13 }}>Failed to load user detail.</div>

  const { profile, consentProfile, recentReports, openReportId } = data

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid #2D2450', background: '#1A1530', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Moderation status */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <StatusChip user={profile} />
        </div>
        <div className="detail-row">
          <span className="detail-label">Warnings</span>
          <span className="detail-value">{profile.warningCount ?? 0}</span>
        </div>
        {profile.suspendedUntil && (
          <div className="detail-row">
            <span className="detail-label">Suspended until</span>
            <span className="detail-value" style={{ fontSize: 12 }}>
              {new Date(profile.suspendedUntil).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Consent profile summary */}
      {consentProfile && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B5FA6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Consent profile</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {consentProfile.openTo?.slice(0, 6).map(tag => (
              <span key={tag} style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, fontSize: 11, padding: '2px 8px' }}>{tag}</span>
            ))}
            {(consentProfile.openTo?.length ?? 0) > 6 && (
              <span style={{ fontSize: 11, color: '#6B5FA6' }}>+{consentProfile.openTo.length - 6} more</span>
            )}
          </div>
          {consentProfile.hardLimits?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {consentProfile.hardLimits.slice(0, 4).map(tag => (
                <span key={tag} style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, fontSize: 11, padding: '2px 8px' }}>{tag}</span>
              ))}
              {consentProfile.hardLimits.length > 4 && (
                <span style={{ fontSize: 11, color: '#6B5FA6' }}>+{consentProfile.hardLimits.length - 4} more limits</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent reports against this user */}
      {recentReports?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B5FA6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Recent reports ({recentReports.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentReports.map(r => (
              <div key={r._id} style={{ background: '#110D1E', border: '1px solid #2D2450', borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ color: '#B8AEE0', minWidth: 120 }}>{CATEGORY_LABELS[r.category] ?? r.category}</span>
                <span style={{ color: '#6B5FA6', fontSize: 11 }}>{timeAgo(r.createdAt)}</span>
                <span style={{ marginLeft: 'auto', color: r.severity === 'critical' ? '#FCA5A5' : r.severity === 'high' ? '#FCD34D' : '#B8AEE0', fontSize: 11, fontWeight: 600 }}>
                  {r.severity}
                </span>
                <span style={{ color: '#6B5FA6', fontSize: 11 }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct moderation action (requires an open report) */}
      {openReportId && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B5FA6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Apply action (via open report)
          </div>
          <textarea
            className="action-textarea"
            placeholder="Moderator notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={400}
            style={{ marginBottom: 10 }}
          />
          <div className="action-bar">
            {ACTIONS.map(a => (
              pendingAction === a.key ? (
                <div key={a.key} style={{ display: 'flex', gap: 6 }}>
                  <button className="action-btn btn-confirm" onClick={() => submitAction(a.key)} disabled={submitting}>
                    {submitting ? 'Applying…' : 'Confirm'}
                  </button>
                  <button className="action-btn btn-cancel" onClick={() => setPendingAction(null)} disabled={submitting}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button key={a.key} className={`action-btn ${a.cls}`} onClick={() => setPendingAction(a.key)} disabled={submitting || !!pendingAction}>
                  {a.label}
                </button>
              )
            ))}
          </div>
        </div>
      )}

      {toast && <div style={{ fontSize: 13, color: toast.startsWith('Action applied') ? '#4ADE80' : '#FCA5A5' }}>{toast}</div>}
    </div>
  )
}

function UserRow({ user, onRefresh }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ background: '#110D1E', border: '1px solid #2D2450', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
      <div
        className="user-row"
        style={{ borderRadius: 0, margin: 0, border: 'none', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <div className="user-name">{user.displayName || '—'}</div>
          <div className="user-id">{user.userId}</div>
        </div>
        <StatusChip user={user} />
        <span style={{ fontSize: 12, color: '#6B5FA6' }}>{user.warningCount ?? 0} warnings</span>
        <span style={{ fontSize: 12, color: user.reportCount > 0 ? '#FCD34D' : '#6B5FA6' }}>
          {user.reportCount ?? 0} reports
        </span>
        <span style={{ fontSize: 12, color: '#6B5FA6' }}>
          {user.createdAt ? timeAgo(user.createdAt) : '—'}
        </span>
        <span style={{ color: '#A78BFA', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </div>

      {expanded && (
        <UserDetailPanel userId={user.userId} onClose={() => { setExpanded(false); onRefresh() }} />
      )}
    </div>
  )
}

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page,    setPage]    = useState(0)

  const debounceRef = useRef(null)
  const lastSearch  = useRef('')

  const fetchUsers = useCallback(async (q, pageNum, append) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 30, offset: pageNum * 30 })
      if (q) params.set('q', q)
      const res  = await fetch(`/api/admin/users?${params}`, { headers: authHeaders() })
      const data = await res.json()
      const rows = data.users ?? []
      setUsers(prev => append ? [...prev, ...rows] : rows)
      setHasMore(data.hasMore ?? false)
    } catch {
      if (!append) setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearch(val) {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      lastSearch.current = val
      setPage(0)
      fetchUsers(val, 0, false)
    }, 350)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchUsers(lastSearch.current, next, true)
  }

  return (
    <>
      <h1 className="page-title">Users</h1>

      <input
        className="search-input"
        placeholder="Search by display name or Clerk user ID…"
        value={search}
        onChange={e => handleSearch(e.target.value)}
        autoFocus
      />

      {users.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 80px 100px 100px',
          gap: 12, padding: '0 16px 8px',
          fontSize: 11, color: '#6B5FA6', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>User</span>
          <span>Status</span>
          <span>Warnings</span>
          <span>Reports</span>
          <span>Joined</span>
          <span />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #7C3AED', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      )}

      {!loading && users.length === 0 && search && (
        <div className="empty-state">No users found for "{search}".</div>
      )}

      {!loading && users.length === 0 && !search && (
        <div className="empty-state">Search for a user above to get started.</div>
      )}

      {users.map(u => (
        <UserRow key={u.userId} user={u} onRefresh={() => fetchUsers(lastSearch.current, 0, false)} />
      ))}

      {hasMore && !loading && (
        <button className="load-more-btn" onClick={loadMore}>Load more</button>
      )}
    </>
  )
}
