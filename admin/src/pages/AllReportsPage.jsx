import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('loom_admin_token')}` }
}

function SeverityBadge({ severity }) {
  if (severity === 'critical') return <span className="badge-critical">Critical</span>
  if (severity === 'high')     return <span className="badge-high">High</span>
  return <span className="badge-standard">Standard</span>
}

function StatusBadge({ status }) {
  const map = {
    pending:             { label: 'Pending',      style: { background: 'rgba(107,95,166,0.2)', color: '#B8AEE0', border: '1px solid #2D2450' } },
    under_review:        { label: 'Under review', style: { background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' } },
    resolved_actioned:   { label: 'Actioned',     style: { background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' } },
    resolved_dismissed:  { label: 'Dismissed',    style: { background: 'rgba(107,95,166,0.1)', color: '#6B5FA6', border: '1px solid #2D2450' } },
  }
  const { label, style } = map[status] ?? { label: status, style: {} }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px', ...style }}>
      {label}
    </span>
  )
}

const CATEGORY_LABELS = {
  fake_or_bot:       'Fake or bot',
  harassment:        'Harassment',
  consent_violation: 'Consent violation',
  illegal_content:   'Illegal content',
  underage_concern:  'Underage concern',
  spam:              'Spam',
  other:             'Other',
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function ReportHistoryRow({ report }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="report-row">
      <div className="report-row-header" onClick={() => setExpanded(v => !v)}
        style={{ gridTemplateColumns: '90px 1fr 1fr 1fr 110px 100px 100px' }}>
        <SeverityBadge severity={report.severity} />
        <span className="report-cell">{CATEGORY_LABELS[report.category] ?? report.category}</span>
        <span className="report-cell">{report.reporterDisplayName}</span>
        <span className="report-cell">{report.reportedDisplayName}</span>
        <StatusBadge status={report.status} />
        <span className="report-cell" style={{ fontSize: 12, color: '#6B5FA6' }}>{timeAgo(report.createdAt)}</span>
        <span style={{ color: '#A78BFA', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </div>

      {expanded && (
        <div className="report-detail">
          <div className="detail-row">
            <span className="detail-label">Reporter</span>
            <span className="detail-value">
              {report.reporterDisplayName}{' '}
              <span style={{ color: '#6B5FA6', fontSize: 11 }}>({report.reporterId})</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Reported user</span>
            <span className="detail-value">
              {report.reportedDisplayName}{' '}
              <span style={{ color: '#6B5FA6', fontSize: 11 }}>({report.reportedUserId})</span>
              {report.reportedIsBanned && (
                <span style={{ color: '#EF4444', fontSize: 11, marginLeft: 8 }}>BANNED</span>
              )}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Content type</span>
            <span className="detail-value">
              {report.contentType}{report.contentId ? ` — ${report.contentId}` : ''}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Category</span>
            <span className="detail-value">{CATEGORY_LABELS[report.category]}</span>
          </div>
          {report.detail && (
            <div className="detail-row" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="detail-label">Reporter detail</span>
              <div className="detail-message">{report.detail}</div>
            </div>
          )}
          {report.autoSuspended && (
            <div className="auto-suspend-chip">
              <AlertTriangle size={12} />
              Auto-suspended pending review
            </div>
          )}
          {report.moderatorNotes && (
            <div className="detail-row" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="detail-label">Moderator notes</span>
              <div className="detail-message">{report.moderatorNotes}</div>
            </div>
          )}
          {report.resolvedAt && (
            <div className="detail-row">
              <span className="detail-label">Resolved</span>
              <span className="detail-value" style={{ fontSize: 12, color: '#6B5FA6' }}>
                {new Date(report.resolvedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const STATUS_TABS = [
  { key: '',                   label: 'All' },
  { key: 'pending',            label: 'Pending' },
  { key: 'under_review',       label: 'Under review' },
  { key: 'resolved_actioned',  label: 'Actioned' },
  { key: 'resolved_dismissed', label: 'Dismissed' },
]

export default function AllReportsPage() {
  const [reports,   setReports]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [hasMore,   setHasMore]   = useState(false)
  const [tabStatus, setTabStatus] = useState('')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(0)

  const debounceRef = useRef(null)

  const load = useCallback(async (status, q, pageNum, append) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 30, offset: pageNum * 30 })
      if (status) params.set('status', status)
      if (q)      params.set('q', q)
      const res  = await fetch(`/api/reports/admin?${params}`, { headers: authHeaders() })
      const data = await res.json()
      const rows = data.reports ?? []
      setReports(prev => append ? [...prev, ...rows] : rows)
      setHasMore(data.hasMore ?? false)
    } catch {
      if (!append) setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset and reload when tab changes
  useEffect(() => {
    setPage(0)
    load(tabStatus, search, 0, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabStatus])

  // Debounce search
  function handleSearch(val) {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      load(tabStatus, val, 0, false)
    }, 350)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(tabStatus, search, next, true)
  }

  return (
    <>
      <h1 className="page-title">All reports</h1>

      <input
        className="search-input"
        placeholder="Search by reporter or reported user…"
        value={search}
        onChange={e => handleSearch(e.target.value)}
      />

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tabStatus === t.key ? 'active' : ''}`}
            onClick={() => setTabStatus(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reports.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 1fr 1fr 110px 100px 100px',
          gap: 12, padding: '0 16px 8px',
          fontSize: 11, color: '#6B5FA6', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Severity</span>
          <span>Category</span>
          <span>Reporter</span>
          <span>Reported user</span>
          <span>Status</span>
          <span>Submitted</span>
          <span />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #7C3AED', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="empty-state">No reports found.</div>
      )}

      {reports.map(r => (
        <ReportHistoryRow key={r._id} report={r} />
      ))}

      {hasMore && !loading && (
        <button className="load-more-btn" onClick={loadMore}>Load more</button>
      )}
    </>
  )
}
