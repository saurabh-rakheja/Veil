import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

const FREE_TIER_LIMIT = 5
const API = import.meta.env.VITE_API_URL

export default function MyInvitesPage() {
  const { getToken } = useAuth()
  const [codes,      setCodes]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')
  const [copied,     setCopied]     = useState(null)

  const fetchCodes = useCallback(async () => {
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/invites/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const data = await res.json(); setCodes(data.codes || []) }
    } catch { /* non-critical */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  async function generate() {
    setGenerating(true); setGenError('')
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/invites/generate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error || 'Failed to generate.'); return }
      await fetchCodes()
    } catch { setGenError('Failed to generate. Please try again.') }
    finally   { setGenerating(false) }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code); setTimeout(() => setCopied(null), 2000)
  }

  const available  = codes.filter(c => c.isActive && !c.usedByUserId).length
  const canGenerate = available < FREE_TIER_LIMIT

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      {/* Hero card */}
      <div className="card invite-hero rise" style={{ marginBottom: 18 }}>
        <div className="inv-hero-art" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, var(--teal-deep), var(--surface-0))',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(8,19,15,0.55), rgba(8,19,15,0.25))' }}/>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="chip sm" style={{ background: 'rgba(8,19,15,0.4)', color: '#fff', borderColor: 'transparent', backdropFilter: 'blur(4px)' }}>
            ✓ Invite-only community
          </span>
          <h2 style={{ fontSize: 25, color: '#fff', margin: '14px 0 8px', maxWidth: 420 }}>
            Bring people you'd personally vouch for
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', maxWidth: 430, lineHeight: 1.55 }}>
            Loom grows through trust, not ads. Every person you invite becomes part of your vouch graph — so invite deliberately.
          </p>
          <div className="inv-counter">
            <div className="inv-dots">
              {Array.from({ length: FREE_TIER_LIMIT }).map((_, i) => (
                <span key={i} className={'inv-dot' + (i < available ? ' on' : '')}/>
              ))}
            </div>
            <span><b>{available}</b> of {FREE_TIER_LIMIT} invites available</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="sk" style={{ width: 38, height: 38, borderRadius: 11 }}/>
              <div style={{ flex: 1 }}>
                <div className="sk sk-line" style={{ width: '50%', height: 15, marginBottom: 8 }}/>
                <div className="sk sk-line" style={{ width: '35%' }}/>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {codes.length > 0 && (
            <div className="invite-list">
              {codes.map(c => {
                const isUsed   = !!c.usedByUserId
                const isActive = c.isActive && !isUsed
                return (
                  <div key={c._id} className={`invite-row ${isUsed ? 'joined' : isActive ? 'available' : 'pending'}`}>
                    <div className="inv-icon">
                      {isUsed ? '✓' : isActive ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      ) : '⏳'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="inv-code">{c.code}</div>
                      <div className="inv-status">
                        {isUsed && <span style={{ color: 'var(--teal)' }}>Used by {c.usedByDisplayName || 'someone'}</span>}
                        {isActive && 'Ready to share · single use'}
                        {!isActive && !isUsed && 'Expired'}
                      </div>
                    </div>
                    {isUsed  && <span className="chip sm" style={{ color: 'var(--teal)', borderColor: 'var(--teal-line)', background: 'var(--teal-dim)' }}>Joined</span>}
                    {isActive && (
                      <button className="btn btn-ghost btn-sm" onClick={() => copyCode(c.code)}>
                        {copied === c.code ? '✓ Copied' : (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {codes.length === 0 && (
            <div className="empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <p>No invite codes yet</p>
              <button className="btn btn-primary" onClick={generate} disabled={generating}
                style={{ marginTop: 12 }}>
                {generating ? 'Generating…' : 'Generate your first code'}
              </button>
            </div>
          )}

          {genError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{genError}</p>}

          {codes.length > 0 && canGenerate && (
            <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate new code'}
            </button>
          )}
          {codes.length > 0 && !canGenerate && (
            <p style={{ fontSize: 13, color: 'var(--text-lo)', marginTop: 14 }}>
              You've used all {FREE_TIER_LIMIT} of your available invite slots.
            </p>
          )}

          {/* Vouch explainer */}
          <div className="card vouch-card" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
              <div className="set-card-ico" style={{ color: 'var(--gold)', background: 'var(--gold-dim)' }}>★</div>
              <h3 style={{ fontSize: 16.5 }}>How vouching builds trust</h3>
            </div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 560 }}>
              When someone you invited becomes active, you can vouch for them. Vouches are public, revocable, and weighted by your own standing — formalising how trust already works in real communities.
            </p>
            <div className="vouch-steps" style={{ marginTop: 16 }}>
              <div className="vstep">🔗 You invite</div>
              <div style={{ color: 'var(--text-lo)', fontSize: 13 }}>→</div>
              <div className="vstep">✓ They verify</div>
              <div style={{ color: 'var(--text-lo)', fontSize: 13 }}>→</div>
              <div className="vstep">★ You vouch</div>
              <div style={{ color: 'var(--text-lo)', fontSize: 13 }}>→</div>
              <div className="vstep gold">♥ Trust grows</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
