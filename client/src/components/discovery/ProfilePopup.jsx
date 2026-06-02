import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import {
  WovenArt, AnonymousArt, WovenAvatar, PhotoAvatar,
  TierPill, LF_LABELS, EXP_LABELS, TIER_COLOR, tierFromVerification,
} from './ProfileCard'

const API = import.meta.env.VITE_API_URL

/* ── Icons ── */
const Ico = ({ d, size = 18, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children || <path d={d}/>}</svg>
)
const IcoX         = p => <Ico {...p}><path d="M18 6L6 18M6 6l12 12"/></Ico>
const IcoLock      = p => <Ico {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Ico>
const IcoSparkle   = p => <Ico {...p}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></Ico>
const IcoShield    = p => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Ico>
const IcoHandshake = p => <Ico {...p}><path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/></Ico>
const IcoCheck     = p => <Ico {...p}><path d="M20 6L9 17l-5-5"/></Ico>
const IcoFlag      = p => <Ico {...p}><path d="M4 22V4M4 4l8-2v11l-8 2M12 2l8 2v11l-8-2"/></Ico>
const IcoClock     = p => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>

/* ── Compat bar ── */
function CompatBar({ value = 0, conflicts = 0 }) {
  const col = value >= 85 ? 'var(--teal-bright)' : value >= 72 ? 'var(--teal)' : 'var(--gold)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-lo)' }}>Compatibility</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-hi)' }}>{value}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ width: value + '%', height: '100%', borderRadius: 99, background: col, transition: 'width .8s cubic-bezier(.2,.7,.2,1)' }}/>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: conflicts ? 'var(--gold)' : 'var(--teal)' }}>
        {conflicts ? <><IcoShield size={13}/>{conflicts} limit to review</> : <><IcoCheck size={13}/>No limit conflicts</>}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   ConsentModal — rendered with z-index: 95 (above pp-scrim: 82)
   so clicks on the textarea / buttons reach this modal, not the
   ProfilePopup scrim behind it.
──────────────────────────────────────────────────────────────── */
function ConsentModal({ user, onClose, onConfirm, loading, error }) {
  const [note,  setNote]  = useState('')
  const alias = user.displayName?.trim() || 'Anonymous'
  const score = user.compatibilityScore || 0
  const MIN   = 50
  const MAX   = 300
  const len   = note.length
  const valid = len >= MIN && len <= MAX

  return (
    /* z-index 95 so it sits above the pp-scrim (82) */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: 'rgba(4,10,8,0.62)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 24,
        animation: 'fadeIn .2s',
      }}
    >
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        {/* Head */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <WovenAvatar seed={user.userId} size={48}/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--teal)' }}>
                Consent handshake
              </div>
              <h3 style={{ fontSize: 19, marginTop: 3 }}>Connect with {alias}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Steps */}
          <div className="consent-steps">
            <div className="cstep done"><IcoCheck size={13}/> You both declared interests &amp; limits</div>
            <div className="cstep done">
              <IcoCheck size={13}/> Compatibility: {score > 0 ? `${score}%` : 'checking…'}
            </div>
            <div className="cstep"><span className="cstep-dot"/> They review &amp; accept before anything opens</div>
          </div>

          {/* Note field — required by API (min 50 chars) */}
          <div>
            <div className="dlabel">
              Introduction message
              <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>
            </div>
            <textarea
              className="ta"
              rows={4}
              maxLength={MAX}
              placeholder="Say why you'd like to connect. Be specific and respectful — they'll use this to decide. (minimum 50 characters)"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 4 }}>
              <span style={{ color: len < MIN ? 'var(--gold)' : 'var(--teal)' }}>
                {len < MIN ? `${MIN - len} more characters needed` : '✓ Good to go'}
              </span>
              <span style={{ color: 'var(--text-lo)' }}>{len} / {MAX}</span>
            </div>
          </div>

          {/* API error */}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--rose-dim)', border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)', fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Info strip */}
          <div className="consent-strip">
            <IcoHandshake size={18}/>
            <span>They won't receive your message until they accept. No cold contact, ever.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button className="btn btn-quiet" onClick={onClose} style={{ flex: 1 }} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(note)}
            style={{ flex: 2 }}
            disabled={!valid || loading}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="mini-spin" style={{ width: 14, height: 14 }}/> Sending…
              </span>
            ) : (
              <><IcoHandshake size={16}/> Send consent request</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main ProfilePopup ── */
export default function ProfilePopup({ user, onClose, requested, onRequestSent }) {
  const { getToken }  = useAuth()
  const [profile,     setProfile]     = useState(null)
  const [showConsent, setShowConsent] = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [apiError,    setApiError]    = useState('')

  /* Fetch full profile */
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getToken().then(token => {
      if (!token) return
      fetch(`${API}/api/users/${user.userId}/public`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !cancelled) setProfile(d) })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [user?.userId, getToken])

  /* Escape key */
  useEffect(() => {
    const h = e => {
      if (e.key !== 'Escape') return
      if (showConsent) setShowConsent(false)
      else onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, showConsent])

  if (!user) return null

  /* Merge card data + full profile */
  const u       = { ...user, ...(profile || {}) }
  const alias   = u.displayName?.trim() || 'Anonymous'
  const tier    = tierFromVerification(u.verificationTier)
  const ringCol = TIER_COLOR[tier]
  const isVerif = u.verificationTier === 'phone_verified' || u.verificationTier === 'id_verified'
  const score   = u.compatibilityScore || 0
  const tags    = (u.lookingFor || []).slice(0, 4)
  const expLbl  = EXP_LABELS[u.experienceLevel] ?? null

  /* ── Submit consent request to real API ── */
  async function handleConsentConfirm(note) {
    setSubmitting(true)
    setApiError('')
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/handshake/initiate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ recipientId: user.userId, introductionMessage: note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error || 'Failed to send request. Please try again.')
        setSubmitting(false)
        return
      }
      /* Success — close everything, remove card from discover */
      setShowConsent(false)
      onClose()
      onRequestSent(user.userId)
    } catch {
      setApiError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* ── Profile card popup ── */}
      <div
        className="pp-scrim"
        onClick={() => { if (!showConsent) onClose() }}
      >
        <div className="pp-card" onClick={e => e.stopPropagation()} role="dialog">
          <div className="pp-scroll">

            {/* Hero */}
            <div className="pp-herowrap">
              <div className="pp-hero">
                {u.hasProfilePhoto
                  ? <img src={`${API}/api/media/${user.userId}/avatar`} alt={alias}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <AnonymousArt/>
                }
                {!u.hasProfilePhoto && (
                  <div className="pp-hero-lock">
                    <IcoLock size={20}/>
                    <span>No photos shared at this level yet</span>
                  </div>
                )}
                <button className="btn-icon pp-x" onClick={onClose}><IcoX size={18}/></button>
                <div className="pp-hero-badges">
                  {score > 0 && <span className="media-match"><IcoSparkle size={12}/>{score}% match</span>}
                </div>
              </div>

              {/* Floating avatar */}
              <div className="pp-avatar">
                {u.hasProfilePhoto
                  ? <PhotoAvatar userId={user.userId} size={84} ring ringColor={ringCol}/>
                  : <WovenAvatar seed={user.userId} size={84} ring ringColor={ringCol}/>
                }
              </div>
            </div>

            {/* Body */}
            <div className="pp-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 23 }}>{alias}</h2>
                  <div className="disc-sub" style={{ fontSize: 13.5, marginTop: 4 }}>
                    {[u.city, u.pronouns].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <TierPill tier={tier}/>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge-verify">
                  <IcoShield size={13}/>{isVerif ? 'Verified · Anonymous' : 'Unverified'}
                </span>
                {u.vouchCount > 0 && (
                  <span className="vouch">★ {u.vouchCount} {u.vouchCount === 1 ? 'vouch' : 'vouches'}</span>
                )}
                {expLbl && <span className="chip sm"><IcoClock size={12}/>{expLbl}</span>}
              </div>

              {u.bio && (
                <div>
                  <div className="dlabel">What they've chosen to share</div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}>{u.bio}</p>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <div className="dlabel">Interests</div>
                  <div className="disc-tags">
                    {tags.map(v => (
                      <span key={v} className="chip sm"
                        style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)', color: 'var(--text)' }}>
                        {LF_LABELS[v] ?? v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(u.sharedInterests || []).length > 0 && (
                <div>
                  <div className="dlabel">Interests in common</div>
                  <div className="disc-tags">
                    {u.sharedInterests.map(t => (
                      <span key={t} className="chip sm"
                        style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)', color: 'var(--text)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 16, boxShadow: 'none', background: 'var(--surface-2)' }}>
                <CompatBar value={score} conflicts={(u.limitConflicts || []).length}/>
              </div>

              <div className="consent-strip">
                <IcoHandshake size={18}/>
                <span>Messaging unlocks only after you both complete a consent handshake. No cold contact, ever.</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-foot" style={{ borderTop: '1px solid var(--line)' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flexShrink: 0 }} title="Close">
              <IcoFlag size={16}/>
            </button>
            <button
              className={`btn ${requested ? 'btn-ghost' : 'btn-primary'}`}
              style={{ flex: 1 }}
              onClick={() => { if (!requested) setShowConsent(true) }}
            >
              {requested
                ? <><IcoCheck size={16}/> Request sent</>
                : <><IcoHandshake size={16}/> Request connection</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Consent modal — z-index 95, above pp-scrim (82) ── */}
      {showConsent && (
        <ConsentModal
          user={u}
          onClose={() => { setShowConsent(false); setApiError('') }}
          onConfirm={handleConsentConfirm}
          loading={submitting}
          error={apiError}
        />
      )}
    </>
  )
}
