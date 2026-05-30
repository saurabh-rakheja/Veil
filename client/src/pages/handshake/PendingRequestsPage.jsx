import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import * as jdenticon from 'jdenticon'

function JdenticonAvatar({ userId, size = 46 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) jdenticon.update(ref.current, userId) }, [userId])
  return <svg ref={ref} width={size} height={size} data-jdenticon-value={userId}
    style={{ borderRadius: '50%', flexShrink: 0 }}/>
}

function timeUntil(date) {
  if (!date) return ''
  const days = Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 1) return 'Expires today'
  return `Expires in ${days} days`
}

export default function PendingRequestsPage() {
  const navigate     = useNavigate()
  const { getToken } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch('/api/handshake/pending', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        setRequests(await res.json())
      } catch { setRequests([]) }
      finally  { setLoading(false) }
    }
    load()
  }, [getToken])

  return (
    <div className="page">
      {loading ? (
        <div className="req-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="sk sk-circle" style={{ width: 46, height: 46 }}/>
                <div style={{ flex: 1 }}>
                  <div className="sk sk-line" style={{ width: '60%', height: 16, marginBottom: 8 }}/>
                  <div className="sk sk-line" style={{ width: '40%' }}/>
                </div>
              </div>
              <div className="sk sk-line" style={{ height: 36, borderRadius: 8 }}/>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
          <p>No pending requests</p>
          <span>Connection requests from other members will appear here. Loom is built for slow, deliberate connection.</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <div className="tabs">
              <span className="tab on">Incoming <span className="cnt">{requests.length}</span></span>
            </div>
            <div className="consent-strip" style={{ flex: '1 1 320px', maxWidth: 520 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <span>Accepting completes a mutual consent handshake — the only thing that opens a conversation.</span>
            </div>
          </div>
          <div className="req-grid">
            {requests.map(req => (
              <div key={req._id} className="card req-card rise">
                <div className="req-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <JdenticonAvatar userId={req.initiatorId}/>
                      <div>
                        <div className="disc-alias" style={{ fontSize: 17 }}>
                          {req.displayName || 'Anonymous'}
                        </div>
                        <div className="disc-sub">{req.city || ''}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-lo)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {timeUntil(req.expiresAt)}
                    </span>
                  </div>

                  {req.introductionMessage && (
                    <div className="req-note">"{req.introductionMessage}"</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge-verify">✓ Verified</span>
                    {req.compatibilityScore > 0 && (
                      <span className="chip sm">✦ {req.compatibilityScore}% match</span>
                    )}
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }}
                    onClick={() => navigate(`/handshake/incoming/${req._id}`)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/></svg>
                    View request
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
