import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import * as jdenticon from 'jdenticon'
import ReportButton from '../../components/reporting/ReportButton'

const EXP_LABELS = {
  curious_exploring: 'Newly curious',
  some_experience:   'Exploring',
  experienced:       'Experienced',
  deeply_embedded:   'Deep community roots',
}
const LOOKING_FOR_LABELS = {
  genuine_connection:    'Genuine connection',
  community_friendship:  'Community & friendship',
  exploration_curiosity: 'Exploration & curiosity',
  relationship:          'A relationship',
  finding_my_people:     'Finding my people',
  not_sure:              'Not sure yet',
}

function JdenticonAvatar({ userId, size = 84 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) jdenticon.update(ref.current, userId) }, [userId])
  return <svg ref={ref} width={size} height={size} data-jdenticon-value={userId}
    style={{ borderRadius: '50%', display: 'block' }}/>
}

function CompatBar({ score, conflictCount = 0 }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(score), 80); return () => clearTimeout(t) }, [score])
  const col = score >= 80 ? 'var(--teal-bright)' : score >= 60 ? 'var(--teal)' : 'var(--gold)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-lo)' }}>Compatibility</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-hi)' }}>{score}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ width: w + '%', height: '100%', borderRadius: 99, background: col, transition: 'width .8s cubic-bezier(.2,.7,.2,1)' }}/>
      </div>
      {conflictCount > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)' }}>
          ⚠ {conflictCount} limit to review before connecting
        </div>
      )}
    </div>
  )
}

function formatCooldown(date) {
  if (!date) return ''
  const days = Math.ceil((new Date(date) - Date.now()) / 86400000)
  if (days <= 0) return 'soon'; if (days === 1) return 'in 1 day'; if (days < 30) return `in ${days} days`
  return `on ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
}

export default function ProfileViewPage() {
  const { userId }   = useParams()
  const navigate     = useNavigate()
  const { getToken } = useAuth()

  const [profile,      setProfile]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [withdrawing,  setWithdrawing]  = useState(false)
  const [connectionId, setConnectionId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const token   = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [profileRes, connsRes] = await Promise.all([
          fetch(`/api/users/${userId}/public`, { headers }),
          fetch('/api/connections/mine',        { headers }),
        ])
        if (!profileRes.ok) throw new Error()
        const profileData = await profileRes.json()
        setProfile(profileData)
        if (profileData.connectionId) setConnectionId(profileData.connectionId)
        if (connsRes.ok) {
          const { connections } = await connsRes.json()
          const found = (connections || []).find(c => c.otherUserId === userId)
          if (found) setConnectionId(found.connectionId)
        }
      } catch { setError('Could not load this profile.') }
      finally  { setLoading(false) }
    }
    load()
  }, [userId, getToken])

  async function handleWithdraw() {
    if (!profile?.handshakeId || withdrawing) return
    setWithdrawing(true)
    try {
      const token = await getToken()
      await fetch(`/api/handshake/${profile.handshakeId}/withdraw`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      setProfile(p => ({ ...p, handshakeStatus: 'none', handshakeId: null }))
    } catch { /* fail silently */ }
    finally { setWithdrawing(false) }
  }

  if (loading) return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="sk" style={{ width: 84, height: 84, borderRadius: '50%' }}/>
        <div className="sk sk-line" style={{ width: '55%', height: 24 }}/>
        <div className="sk sk-line" style={{ width: '35%' }}/>
        <div className="sk" style={{ height: 100, borderRadius: 'var(--r-lg)' }}/>
        <div className="sk" style={{ height: 52, borderRadius: 99 }}/>
      </div>
    </div>
  )

  if (error) return (
    <div className="page" style={{ maxWidth: 540 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>← Back</button>
      <p style={{ color: 'var(--text-lo)', fontSize: 14 }}>{error}</p>
    </div>
  )

  const { displayName, city, pronouns, bio, verificationTier, memberSince, vouchCount,
    experienceLevel, lookingFor = [], interests = [], compatibilityScore,
    limitConflicts = [], sharedInterests = [], handshakeStatus, handshakeId,
    cooldownUntil, connectionTier } = profile

  const name       = displayName?.trim() || null
  const expLabel   = EXP_LABELS[experienceLevel] ?? null
  const memberDate = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null
  const isVerified = verificationTier === 'phone_verified' || verificationTier === 'id_verified'

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>← Back</button>

      {/* Profile popup card - matches design's pp-card layout */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Hero area */}
        <div style={{ height: 160, background: 'linear-gradient(135deg, var(--teal-deep), var(--surface-2))', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,19,15,0.3)' }}/>
          {compatibilityScore > 0 && (
            <div style={{ position: 'absolute', top: 14, right: 18 }}>
              <span className="media-match">✦ {compatibilityScore}%</span>
            </div>
          )}
        </div>

        {/* Avatar overlapping hero */}
        <div style={{ position: 'relative', marginTop: -42, paddingLeft: 22, marginBottom: 8 }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', border: '3px solid var(--surface-1)', overflow: 'hidden', display: 'inline-block' }}>
            <JdenticonAvatar userId={userId} size={84}/>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22 }}>{name ?? <span style={{ color: 'var(--text-lo)', fontStyle: 'italic' }}>Anonymous</span>}</h2>
              {(city || pronouns) && (
                <div className="disc-sub" style={{ fontSize: 13, marginTop: 3 }}>
                  {[city, pronouns].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            {expLabel && (
              <span className="chip sm" style={{ whiteSpace: 'nowrap' }}>{expLabel}</span>
            )}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isVerified && <span className="badge-verify">✓ Verified · Anonymous</span>}
            {vouchCount > 0 && <span className="vouch">★ {vouchCount} {vouchCount === 1 ? 'vouch' : 'vouches'}</span>}
            {memberDate && <span className="chip sm">Member since {memberDate}</span>}
          </div>

          {/* Bio */}
          {connectionTier !== 'none' && bio && (
            <div>
              <div className="dlabel">What they've chosen to share</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}>{bio}</p>
            </div>
          )}

          {/* Looking for */}
          {lookingFor.length > 0 && (
            <div>
              <div className="dlabel">Looking for</div>
              <div className="disc-tags">
                {lookingFor.map(v => (
                  <span key={v} className="chip sm" style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)' }}>
                    {LOOKING_FOR_LABELS[v] ?? v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared interests */}
          {connectionTier !== 'none' && sharedInterests.length > 0 && (
            <div>
              <div className="dlabel">Interests in common</div>
              <div className="disc-tags">
                {sharedInterests.map(t => (
                  <span key={t} className="chip sm" style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Compat */}
          <div className="card" style={{ padding: 16, boxShadow: 'none', background: 'var(--surface-2)' }}>
            <CompatBar score={compatibilityScore || 0} conflictCount={limitConflicts.length}/>
          </div>

          {/* Limit conflicts */}
          {limitConflicts.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--gold-dim)', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>
                ⚠ Potential compatibility conflict
              </div>
              {limitConflicts.map(tag => (
                <p key={tag} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 4 }}>
                  Their interest in <b>{tag}</b> overlaps with your stated limit
                </p>
              ))}
              <p style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 6 }}>This is here to help you make an informed decision.</p>
            </div>
          )}

          {/* Consent strip */}
          <div className="consent-strip">
            <span>🤝</span>
            <span>Messaging unlocks only after you both complete a consent handshake. No cold contact, ever.</span>
          </div>

          {/* Action */}
          <ActionArea
            status={handshakeStatus} handshakeId={handshakeId} cooldownUntil={cooldownUntil}
            recipientId={userId} recipientName={name ?? 'them'} connectionId={connectionId}
            onWithdraw={handleWithdraw} withdrawing={withdrawing} navigate={navigate}/>

          {/* Report */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ReportButton reportedUserId={userId} contentType="profile" contentId={null}/>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionArea({ status, handshakeId, cooldownUntil, recipientId, recipientName, connectionId, onWithdraw, withdrawing, navigate }) {
  if (status === 'none') return (
    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/handshake/${recipientId}`)}>
      🤝 Initiate a handshake
    </button>
  )
  if (status === 'pending_sent') return (
    <>
      <button className="btn btn-ghost" style={{ width: '100%' }} disabled>Request pending…</button>
      <button className="btn btn-quiet btn-sm" style={{ width: '100%', marginTop: 8 }}
        onClick={onWithdraw} disabled={withdrawing}>
        {withdrawing ? 'Withdrawing…' : 'Withdraw request'}
      </button>
    </>
  )
  if (status === 'pending_received') return (
    <>
      <div className="consent-strip" style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)' }}>
        <span>🤝</span><span>They've sent you a handshake request</span>
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }}
        onClick={() => navigate(`/handshake/incoming/${handshakeId}`)}>
        View request
      </button>
    </>
  )
  if (status === 'accepted') return (
    <button className="btn btn-primary" style={{ width: '100%' }}
      onClick={() => connectionId && navigate(`/chat/${connectionId}`)}
      disabled={!connectionId}>
      {connectionId ? '💬 View messages' : 'Loading…'}
    </button>
  )
  if (status === 'cooldown') return (
    <div className="consent-strip" style={{ background: 'var(--gold-dim)', borderColor: 'color-mix(in srgb, var(--gold) 40%, transparent)' }}>
      <span>⏱</span><span>Request declined. Available {formatCooldown(cooldownUntil)}</span>
    </div>
  )
  return null
}
