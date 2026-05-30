import { useState, useEffect, useRef } from 'react'
import { useSignUp, useAuth } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'

function LoomMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flex: 'none' }}>
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="var(--surface-2)" stroke="var(--line-2)"/>
      <g strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M11 13c6 0 6 14 12 14s6-14 6-14" stroke="var(--teal)"/>
        <path d="M11 27c6 0 6-14 12-14s6 14 6 14" stroke="var(--gold)" opacity="0.92"/>
      </g>
      <circle cx="20" cy="20" r="2.1" fill="var(--surface-2)"/>
    </svg>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
    </svg>
  )
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {[0, 200, 400].map(d => (
        <span key={d} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#042019',
          animation: `pulse 1.2s ease infinite ${d}ms`,
          display: 'inline-block',
        }}/>
      ))}
    </span>
  )
}

/* ── Alphanumeric code boxes, 6 chars ── */
const CODE_LENGTH = 6
function CodeBoxes({ onComplete }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const refs = useRef([])
  useEffect(() => { refs.current[0]?.focus() }, [])
  const full = digits.every(d => d !== '')
  useEffect(() => { if (full) onComplete(digits.join('')) }, [full, digits])

  const setAt = (i, val) => {
    const v = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!v) { setDigits(d => { const n=[...d]; n[i]=''; return n }); return }
    setDigits(d => {
      const n = [...d]
      v.split('').forEach((ch, k) => { if (i+k < CODE_LENGTH) n[i+k] = ch })
      return n
    })
    refs.current[Math.min(i + v.length, CODE_LENGTH - 1)]?.focus()
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i-1]?.focus()
  }
  return (
    <div className="code-row" style={{ margin: '22px 0 6px' }}>
      {digits.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          className={`code-box${d ? ' filled' : ''}`}
          inputMode="text" maxLength={CODE_LENGTH} value={d}
          onChange={e => setAt(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          autoCapitalize="characters" autoCorrect="off" spellCheck={false}/>
      ))}
    </div>
  )
}

export default function SignupPage() {
  const { isSignedIn, getToken } = useAuth()
  const { isLoaded, signUp, setActive } = useSignUp()
  const navigate = useNavigate()

  const [step, setStep]           = useState('form')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const [inviteCode,   setInviteCode]   = useState('')
  const [inviteStatus, setInviteStatus] = useState('idle')
  const [inviteMsg,    setInviteMsg]    = useState('')

  useEffect(() => { if (isSignedIn) navigate('/', { replace: true }) }, [isSignedIn, navigate])

  async function validateInvite() {
    const trimmed = inviteCode.trim().toUpperCase()
    if (!trimmed) return
    setInviteStatus('validating'); setInviteMsg('')
    try {
      const res = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()
      if (data.valid) { setInviteStatus('valid'); setInviteMsg('Valid invite code') }
      else { setInviteStatus('invalid'); setInviteMsg(data.error || 'Invalid or already used code') }
    } catch {
      setInviteStatus('invalid'); setInviteMsg('Could not validate — check your connection')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isLoaded || loading || inviteStatus !== 'valid') return
    setLoading(true); setError('')
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err) {
      const raw = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Sign up failed.'
      setError(raw.replace(/^clerk:\s*/i, ''))
    } finally { setLoading(false) }
  }

  async function handleVerify(code) {
    if (!isLoaded || loading) return
    setLoading(true); setError('')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        try {
          const token = await getToken()
          await fetch('/api/invites/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
          })
        } catch { /* non-critical */ }
        navigate('/')
      } else { setError('Verification incomplete. Please try again.') }
    } catch (err) {
      const raw = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Verification failed.'
      setError(raw.replace(/^clerk:\s*/i, ''))
    } finally { setLoading(false) }
  }

  const threads = (
    <svg className="onb-threads" preserveAspectRatio="none" viewBox="0 0 1440 900">
      <path className="t1" d="M-50 200 C 300 120 500 320 760 240 S 1200 120 1500 260"/>
      <path className="t2" d="M-50 460 C 300 380 560 560 820 480 S 1220 360 1500 500"/>
      <path className="t3" d="M-50 700 C 320 640 540 800 820 720 S 1240 620 1500 740"/>
    </svg>
  )

  /* ── Verify step ── */
  if (step === 'verify') {
    return (
      <div className="onb">
        {threads}
        <div className="onb-card s-rise">
          <span className="back-link" style={{ cursor: 'pointer' }}
            onClick={() => { setStep('form'); setError('') }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            Back
          </span>
          <div className="onb-brand" style={{ marginBottom: 18 }}>
            <LoomMark size={32}/>
            <span className="brand-name display" style={{ fontSize: 19 }}>loom</span>
          </div>
          <h1 className="onb-h" style={{ fontSize: 24 }}>Check your email</h1>
          <p className="onb-p">
            We sent a {CODE_LENGTH}-character code to{' '}
            <b style={{ color: 'var(--text-hi)' }}>{email}</b>.
            Enter it below to verify your account.
          </p>

          <CodeBoxes onComplete={handleVerify}/>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</div>}

          <div className="trust-row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <span className="tr">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Your email is stored encrypted, never shown to anyone
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Sign-up form ── */
  const inviteValid   = inviteStatus === 'valid'
  const inviteInvalid = inviteStatus === 'invalid'

  return (
    <div className="onb">
      {threads}
      <div className="onb-card s-rise">
        <div className="onb-brand">
          <LoomMark size={36}/>
          <span className="brand-name display">loom</span>
          <span className="onb-invite-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            Invite-only
          </span>
        </div>
        <h1 className="onb-h">A space that protects you, by design.</h1>
        <p className="onb-p">Consent-first, private, and built for people exploring on their own terms.</p>

        <div className="seg-auth" style={{ marginTop: 22, marginBottom: 4 }}>
          <button className="on">Create account</button>
          <button onClick={() => navigate('/login')}>Sign in</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label">Email address</label>
            <div className="input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              <input type="email" placeholder="you@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                autoComplete="email" disabled={loading}/>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              <input type={showPw ? 'text' : 'password'}
                placeholder="Create a password" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="new-password" disabled={loading}/>
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                <EyeIcon open={showPw}/>
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Invite code</label>
            <div className="input-wrap" style={{
              borderColor: inviteValid ? 'var(--teal)' : inviteInvalid ? 'var(--danger)' : undefined,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <input type="text" value={inviteCode}
                onChange={e => {
                  setInviteCode(e.target.value.toUpperCase())
                  if (inviteStatus !== 'idle') { setInviteStatus('idle'); setInviteMsg('') }
                }}
                onBlur={validateInvite}
                placeholder="XXXXXXXX"
                maxLength={8} autoComplete="off" spellCheck={false} disabled={loading}/>
              {inviteValid   && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M20 6L9 17l-5-5"/></svg>}
              {inviteInvalid && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </div>
            {inviteMsg && (
              <p style={{
                fontSize: 12, marginTop: 6,
                color: inviteValid ? 'var(--teal)' : 'var(--danger)',
              }}>{inviteMsg}</p>
            )}
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}

          <button type="submit" className="onb-btn"
            disabled={loading || !isLoaded || inviteStatus !== 'valid'}>
            {loading ? <LoadingDots/> : <>Continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
          </button>
        </form>

        <div className="trust-row">
          <span className="tr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> Verified adults only</span>
          <span className="tr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Encrypted &amp; private</span>
          <span className="tr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/></svg> No cold contact</span>
        </div>
        <p className="legal">
          By continuing you confirm you're 18+ and agree to our <Link to="/safety" style={{ color: 'var(--teal)', fontWeight: 600 }}>Consent Agreement</Link> and Privacy Policy.
        </p>
        <p className="legal" style={{ marginTop: 8 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
