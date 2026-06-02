import { useState, useEffect, useRef } from 'react'
import { useSignIn, useAuth } from '@clerk/clerk-react'
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

/* ── Verification code boxes — alphanumeric, 6 chars ── */
const CODE_LENGTH = 6
function CodeBoxes({ value, onChange, onComplete }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const refs = useRef([])

  useEffect(() => { refs.current[0]?.focus() }, [])

  const full = digits.every(d => d !== '')
  useEffect(() => {
    if (full) { onComplete(digits.join('')); onChange(digits.join('')) }
  }, [full, digits])

  const setAt = (i, val) => {
    const v = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!v) { setDigits(d => { const n=[...d]; n[i]=''; return n }); return }
    setDigits(d => {
      const n = [...d]
      v.split('').forEach((ch, k) => { if (i+k < CODE_LENGTH) n[i+k] = ch })
      return n
    })
    onChange(digits.join(''))
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

export default function LoginPage() {
  const { isSignedIn } = useAuth()
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()

  const [step, setStep]             = useState('credentials')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPw]   = useState(false)
  const [otpValue, setOtpValue]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resentMsg, setResentMsg]   = useState(false)

  useEffect(() => { if (isSignedIn) navigate('/', { replace: true }) }, [isSignedIn, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isLoaded || loading) return
    setLoading(true); setError('')
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId }); navigate('/'); return
      }
      if (result.status === 'needs_first_factor') {
        try {
          const ef = result.supportedFirstFactors?.find(f => f.strategy === 'email_code')
          await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: ef?.emailAddressId })
        } catch { /* code may already be sent */ }
        setStep('otp'); return
      }
      if (result.status === 'needs_second_factor') {
        try { await signIn.prepareSecondFactor({ strategy: 'email_code' }) } catch { /* ok */ }
        setStep('otp'); return
      }
      if (result.status === 'needs_new_password') {
        setError('You need to reset your password. Use Forgot password below.'); return
      }
      // Any other status is unexpected — surface it instead of masking it.
      setError(`Sign in couldn't be completed (status: ${result.status}).`)
    } catch (err) {
      // Surface Clerk's actual error so real problems (wrong password, etc.)
      // are visible to the user rather than hidden behind a generic message.
      const clerkErr = err?.errors?.[0]
      const raw = clerkErr?.message || clerkErr?.longMessage || 'Sign in failed.'
      setError(raw.replace(/^clerk:\s*/i, ''))
    } finally { setLoading(false) }
  }

  async function handleVerifyOTP(code) {
    if (!isLoaded || loading) return
    setLoading(true); setError('')
    try {
      let result
      try { result = await signIn.attemptSecondFactor({ strategy: 'email_code', code }) }
      catch { result = await signIn.attemptFirstFactor({ strategy: 'email_code', code }) }
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId }); navigate('/')
      } else { setError('Verification failed. Please check the code and try again.') }
    } catch (err) {
      const raw = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Verification failed.'
      setError(raw.replace(/^clerk:\s*/i, ''))
    } finally { setLoading(false) }
  }

  async function handleResendOTP() {
    try {
      if (signIn.status === 'needs_second_factor') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' })
      } else {
        const ef = signIn.supportedFirstFactors?.find(f => f.strategy === 'email_code')
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: ef?.emailAddressId })
      }
      setResentMsg(true); setTimeout(() => setResentMsg(false), 3000)
    } catch (err) { console.error('Resend failed:', err) }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first, then click Forgot password.'); return }
    setError('')
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email })
      setSuccessMsg('Password reset email sent.'); setTimeout(() => setSuccessMsg(''), 5000)
    } catch {
      setSuccessMsg('Password reset email sent.'); setTimeout(() => setSuccessMsg(''), 5000)
    }
  }

  /* ── OTP step ── */
  if (step === 'otp') {
    return (
      <div className="onb">
        <svg className="onb-threads" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path className="t1" d="M-50 200 C 300 120 500 320 760 240 S 1200 120 1500 260"/>
          <path className="t2" d="M-50 460 C 300 380 560 560 820 480 S 1220 360 1500 500"/>
          <path className="t3" d="M-50 700 C 320 640 540 800 820 720 S 1240 620 1500 740"/>
        </svg>
        <div className="onb-card s-rise">
          <span className="back-link" style={{ cursor: 'pointer' }}
            onClick={() => { setStep('credentials'); setError(''); setOtpValue('') }}>
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
            Enter it below to confirm it's really you.
          </p>

          <CodeBoxes
            value={otpValue}
            onChange={setOtpValue}
            onComplete={handleVerifyOTP}
          />

          {error     && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</div>}
          {resentMsg && <p style={{ color: 'var(--teal)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>Code resent.</p>}

          <button className="onb-btn" disabled={loading || otpValue.length < CODE_LENGTH}
            onClick={() => handleVerifyOTP(otpValue)} style={{ marginTop: 16 }}>
            {loading ? <LoadingDots/> : 'Verify'}
          </button>

          <p className="resend" style={{ marginTop: 16 }}>
            Didn't get it?{' '}
            <b style={{ cursor: 'pointer', color: 'var(--teal)' }} onClick={handleResendOTP}>Resend code</b>
          </p>
          <div className="trust-row" style={{ justifyContent: 'center' }}>
            <span className="tr">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Your email is stored encrypted, never shown to anyone
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Credentials step ── */
  return (
    <div className="onb">
      <svg className="onb-threads" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <path className="t1" d="M-50 200 C 300 120 500 320 760 240 S 1200 120 1500 260"/>
        <path className="t2" d="M-50 460 C 300 380 560 560 820 480 S 1220 360 1500 500"/>
        <path className="t3" d="M-50 700 C 320 640 540 800 820 720 S 1240 620 1500 740"/>
      </svg>
      <div className="onb-card s-rise">
        <div className="onb-brand">
          <LoomMark size={36}/>
          <span className="brand-name display">loom</span>
        </div>
        <h1 className="onb-h">Welcome back.</h1>
        <p className="onb-p">Sign in to your private space.</p>

        <div className="seg-auth" style={{ marginTop: 18, marginBottom: 4 }}>
          <button className="" onClick={() => navigate('/signup')}>Create account</button>
          <button className="on">Sign in</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label">Email address</label>
            <div className="input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              <input type="email" placeholder="you@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                autoComplete="email" disabled={loading}/>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              <input type={showPassword ? 'text' : 'password'}
                placeholder="Your password" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password" disabled={loading}/>
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                <EyeIcon open={showPassword}/>
              </button>
            </div>
            <a className="pw-forgot" onClick={handleForgotPassword} style={{ cursor: 'pointer' }}>
              Forgot password?
            </a>
          </div>

          {successMsg && <div style={{ color: 'var(--teal)', fontSize: 13, marginTop: 8 }}>{successMsg}</div>}
          {error      && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}

          <button type="submit" className="onb-btn" disabled={loading || !isLoaded}>
            {loading ? <LoadingDots/> : <>Sign in <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
          </button>
        </form>

        <div className="trust-row">
          <span className="tr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> Verified adults only</span>
          <span className="tr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Encrypted &amp; private</span>
        </div>
        <p className="legal">
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--teal)', fontWeight: 600 }}>Join Loom</Link>
        </p>
      </div>
    </div>
  )
}
