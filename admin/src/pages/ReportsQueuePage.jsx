import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const ACTIONS = [
  { key: 'warn',          label: 'Warn',           cls: 'btn-warn'    },
  { key: 'suspend_7d',    label: 'Suspend 7 days', cls: 'btn-suspend' },
  { key: 'permanent_ban', label: 'Permanent ban',  cls: 'btn-ban'     },
  { key: 'dismissed',     label: 'Dismiss',        cls: 'btn-dismiss' },
]

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('loom_admin_token')}` }
}

function SeverityBadge({ severity }) {
  if (severity === 'critical') return <span className="badge-critical">Critical</span>
  if (severity === 'high')     return <span className="badge-high">High</span>
  return <span className="badge-standard">Standard</span>
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400)return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function ReportRow({ report, onActioned }) {
  const [expanded,      setExpanded]      = useState(false)
  const [pendingAction, setPendingAction] = useState(null)   // key awaiting confirm
  const [notes,         setNotes]         = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [toast,         setToast]         = useState('')

  const CATEGORY_LABELS = {
    fake_or_bot:       'Fake or bot',
    harassment:        'Harassment',
    consent_violation: 'Consent violation',
    illegal_content:   'Illegal content',
    underage_concern:  'Underage concern',
    spam:              'Spam',
    other:             'Other',
  }

  async function submitAction(key) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/admin/${report._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({ action: key, moderatorNotes: notes }),
      })
      if (!res.ok) throw new Error()
      onActioned(report._id)
    } catch {
      setToast('Action failed. Please try again.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  return (
    <div className="report-row">
      <div className="report-row-header" onClick={() => setExpanded(v => !v)}>
        <SeverityBadge severity={report.severity} />
        <span className="report-cell">{CATEGORY_LABELS[report.category] ?? report.category}</span>
        <span className="report-cell">{report.reporterDisplayName}</span>
        <span className="report-cell">{report.reportedDisplayName}</span>
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
            <span className="detail-value">{report.reporterDisplayName} <span style={{ color: '#6B5FA6', fontSize: 11 }}>({report.reporterId})</span></span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Reported user</span>
            <span className="detail-value">
              {report.reportedDisplayName} <span style={{ color: '#6B5FA6', fontSize: 11 }}>({report.reportedUserId})</span>
              {report.reportedIsBanned && <span style={{ color: '#EF4444', fontSize: 11, marginLeft: 8 }}>BANNED</span>}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Content type</span>
            <span className="detail-value">{report.contentType}{report.contentId ? ` — ${report.contentId}` : ''}</span>
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
          {report.reportedWarningCount > 0 && (
            <div className="detail-row">
              <span className="detail-label">Prior warnings</span>
              <span className="detail-value">{report.reportedWarningCount}</span>
            </div>
          )}

          {/* Moderator notes */}
          <textarea
            className="action-textarea"
            placeholder="Moderator notes (optional but encouraged)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={400}
          />

          {/* Action buttons */}
          <div className="action-bar">
            {ACTIONS.map(a => (
              pendingAction === a.key ? (
                <div key={a.key} style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`action-btn btn-confirm`}
                    onClick={() => submitAction(a.key)}
                    disabled={submitting}
                  >
                    {submitting ? 'Applying…' : 'Confirm'}
                  </button>
                  <button
                    className="action-btn btn-cancel"
                    onClick={() => setPendingAction(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  key={a.key}
                  className={`action-btn ${a.cls}`}
                  onClick={() => setPendingAction(a.key)}
                  disabled={submitting || !!pendingAction}
                >
                  {a.label}
                </button>
              )
            ))}
          </div>

          {toast && <div style={{ fontSize: 13, color: '#FCA5A5' }}>{toast}</div>}
        </div>
      )}
    </div>
  )
}

export default function ReportsQueuePage() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [hasMore,  setHasMore]  = useState(false)
  const [tabStatus, setTabStatus] = useState('pending')

  const load = useCallback(async (status) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/reports/admin?status=${status}&limit=30`, { headers: authHeaders() })
      const data = await res.json()
      setReports(data.reports ?? [])
      setHasMore(data.hasMore ?? false)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tabStatus) }, [tabStatus, load])

  function handleActioned(id) {
    setReports(prev => prev.filter(r => r._id !== id))
  }

  const TABS = [
    { key: 'pending',      label: 'Pending' },
    { key: 'under_review', label: 'Under review' },
  ]

  return (
    <>
      <h1 className="page-title">Reports queue</h1>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tabStatus === t.key ? 'active' : ''}`}
            onClick={() => setTabStatus(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Column headings */}
      {reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 100px 120px', gap: 12, padding: '0 16px 8px', fontSize: 11, color: '#6B5FA6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Severity</span>
          <span>Category</span>
          <span>Reporter</span>
          <span>Reported user</span>
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
        <div className="empty-state">No reports in this queue.</div>
      )}

      {!loading && reports.map(r => (
        <ReportRow key={r._id} report={r} onActioned={handleActioned} />
      ))}
    </>
  )
}
