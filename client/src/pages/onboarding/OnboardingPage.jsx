import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

const API = import.meta.env.VITE_API_URL

/* ── Shared icons ── */
const Ico = ({ d, size = 18, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children || <path d={d}/>}</svg>
)
const IcoArrow   = (p) => <Ico {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ico>
const IcoShield  = (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Ico>
const IcoEye     = (p) => <Ico {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Ico>
const IcoLock    = (p) => <Ico {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Ico>
const IcoLink    = (p) => <Ico {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Ico>
const IcoCheck   = (p) => <Ico {...p}><path d="M20 6L9 17l-5-5"/></Ico>
const IcoPlus    = (p) => <Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>
const IcoX       = (p) => <Ico {...p}><path d="M18 6L6 18M6 6l12 12"/></Ico>
const IcoStar    = (p) => <Ico {...p}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.6 6.1 21l1.2-6.5L2.5 9.4l6.6-.9z"/></Ico>

/* ── Brand mark ── */
function LoomMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="var(--surface-2)" stroke="var(--line-2)"/>
      <g strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M11 13c6 0 6 14 12 14s6-14 6-14" stroke="var(--teal)"/>
        <path d="M11 27c6 0 6-14 12-14s6 14 6 14" stroke="var(--gold)" opacity="0.92"/>
      </g>
      <circle cx="20" cy="20" r="2.1" fill="var(--surface-2)"/>
    </svg>
  )
}

/* ── Animated illustrations ── */
function IllusPace() {
  return (
    <svg width="220" height="170" viewBox="0 0 220 170">
      <path className="draw" style={{ '--len': 900 }} fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeLinecap="round"
        d="M20 140 C 60 140 60 40 110 40 S 160 140 200 90"/>
      <path className="draw" style={{ '--len': 900, animationDelay: '.25s' }} fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" opacity=".75"
        d="M20 120 C 70 120 70 70 110 70 S 150 120 200 70"/>
      <circle className="fade-late" cx="200" cy="90" r="6" fill="var(--teal)"/>
      <circle className="fade-late" cx="20" cy="140" r="5" fill="var(--gold)"/>
    </svg>
  )
}
function IllusConsent() {
  return (
    <svg width="220" height="170" viewBox="0 0 220 170">
      <path className="draw" style={{ '--len': 320 }} stroke="var(--teal)" strokeWidth="2.6" strokeLinecap="round" fill="none"
        d="M14 90 C 50 90 70 70 96 84"/>
      <path className="draw" style={{ '--len': 320, animationDelay: '.15s' }} stroke="var(--gold)" strokeWidth="2.6" strokeLinecap="round" fill="none"
        d="M206 90 C 170 90 150 70 124 84"/>
      <g className="grow-late gl-2">
        <circle cx="110" cy="86" r="15" fill="none" stroke="var(--teal)" strokeWidth="2.4"/>
        <circle cx="110" cy="86" r="6" fill="var(--gold)"/>
      </g>
      <circle className="fade-late" cx="14" cy="90" r="5" fill="var(--teal)"/>
      <circle className="fade-late" cx="206" cy="90" r="5" fill="var(--gold)"/>
    </svg>
  )
}
function IllusVerified() {
  return (
    <svg width="200" height="180" viewBox="0 0 200 180">
      <defs>
        <radialGradient id="onb_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#7cc8ff"/><stop offset="55%" stopColor="var(--teal)"/><stop offset="100%" stopColor="#1b6b59"/>
        </radialGradient>
      </defs>
      <g className="bloom">
        <circle cx="100" cy="86" r="40" fill="url(#onb_orb)" opacity=".9"/>
        <g stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeLinecap="round" className="pulse-soft">
          <line x1="74" y1="78" x2="126" y2="78"/><line x1="70" y1="92" x2="130" y2="92"/><line x1="78" y1="106" x2="122" y2="106"/>
        </g>
      </g>
      <path className="draw" style={{ '--len': 460 }} fill="none" stroke="var(--gold)" strokeWidth="2.6" strokeLinejoin="round"
        d="M100 26 L150 44 V96 C150 132 100 156 100 156 C100 156 50 132 50 96 V44 Z"/>
      <path className="fade-late" fill="none" stroke="var(--gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
        d="M82 92 l12 12 24 -26"/>
    </svg>
  )
}
function IllusTerms() {
  return (
    <svg width="200" height="170" viewBox="0 0 200 170">
      {[{r:62,c:'var(--tier-public)',cls:''},{r:42,c:'var(--tier-connected)',cls:'gl-2'},{r:22,c:'var(--tier-trusted)',cls:'gl-3'}].map((rg,i) => (
        <circle key={i} className={`grow-late ${rg.cls}`} cx="100" cy="85" r={rg.r} fill="none"
          stroke={rg.c} strokeWidth={i===2?3:2.2} strokeDasharray={i===0?'3 7':'none'} opacity={i===0?.6:1}/>
      ))}
      <circle className="grow-late gl-3" cx="100" cy="85" r="7" fill="var(--gold)"/>
      <circle className="bloom" cx="100" cy="85" r="3" fill="var(--surface-1)"/>
    </svg>
  )
}
function IllusBe() {
  return (
    <svg width="200" height="170" viewBox="0 0 200 170">
      <defs>
        <radialGradient id="onb_bloomg" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#ffe39a"/><stop offset="40%" stopColor="var(--gold)"/>
          <stop offset="75%" stopColor="var(--teal)"/><stop offset="100%" stopColor="#5a4bd6"/>
        </radialGradient>
      </defs>
      <circle className="bloom" cx="100" cy="85" r="48" fill="url(#onb_bloomg)"/>
      <g className="spin-slow" style={{ transformOrigin: '100px 85px' }}>
        <g stroke="rgba(255,255,255,.55)" strokeWidth="1.4" fill="none" opacity=".8">
          <path d="M100 37 a48 48 0 0 1 0 96"/><path d="M100 37 a36 60 0 0 0 0 96"/><path d="M52 85 h96"/>
        </g>
      </g>
      <g className="fade-late">
        <path d="M158 44 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="var(--gold)"/>
        <path d="M44 120 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="var(--teal)"/>
      </g>
    </svg>
  )
}

const STORY = [
  { Illus: IllusPace,    eyebrow: 'At your pace',      h: 'Some connections are worth slowing down for.',
    p: "There's no feed to perform for and no clock running. You move only when it feels right — and never a moment before." },
  { Illus: IllusConsent, eyebrow: 'Consent, built in',  h: 'No one reaches you uninvited.',
    p: "A conversation opens only when you both choose it. Unwanted messages don't get filtered out — they simply can't arrive." },
  { Illus: IllusVerified,eyebrow: 'Real, yet unseen',   h: 'Everyone is verified. No one is exposed.',
    p: "We confirm every person is a real adult, then keep their identity — and yours — to ourselves. Accountability behind the scenes, anonymity in front." },
  { Illus: IllusTerms,   eyebrow: 'On your terms',      h: "You're only ever seen in the light you choose.",
    p: "What you reveal is yours to give, one layer at a time — and always yours to take back. Nothing about you is on display by default." },
  { Illus: IllusBe,      eyebrow: 'Welcome',             h: 'Be exactly who you are.',
    p: 'Quietly, completely, and safely. This is a place built to protect that. Welcome to Loom.', final: true },
]

/* ── Story slides ── */
function StoryPhase({ onDone }) {
  const [i, setI] = useState(0)
  const s    = STORY[i]
  const last = i === STORY.length - 1
  return (
    <div className="onb-card onb-wide story-card s-rise">
      <div className="story-illus"><div key={i}><s.Illus/></div></div>
      <div className="story-body">
        <div key={i}>
          <div className="story-eyebrow s-rise s-rise-1">{s.eyebrow}</div>
          <h2 className="story-h s-rise s-rise-2">{s.h}</h2>
          <p className="story-p s-rise s-rise-3">{s.p}</p>
        </div>
        <div className="story-foot">
          <div className="dots">
            {STORY.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} style={{ cursor: 'pointer' }}/>)}
          </div>
          <div style={{ flex: 1 }}/>
          {!last && <span className="skip" onClick={onDone}>Skip</span>}
          <button className="onb-btn" style={{ width: 'auto', margin: 0, padding: '12px 22px' }}
            onClick={() => last ? onDone() : setI(i + 1)}>
            {last ? <>Enter Loom <IcoArrow size={18}/></> : <>Next <IcoArrow size={18}/></>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Kink picker ── */
const KINKS = [
  'Rope & Shibari', 'Sensory play', 'Impact', 'Bondage', 'Primal', 'Service',
  'Brat', 'Aftercare-first', 'Praise', 'Roleplay', 'Negotiation', 'Slow to meet',
  'Ethical non-monogamy', 'Polyamory', 'Munches & events', 'Newly curious',
]
function KinkPicker({ value = [], onChange }) {
  const toggle = k => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k])
  return (
    <div className="kink-wrap">
      {KINKS.map(k => {
        const on = value.includes(k)
        return (
          <button key={k} className={`kink-chip${on ? ' on' : ''}`} onClick={() => toggle(k)}>
            {on ? <IcoCheck size={13}/> : <IcoPlus size={13}/>}{k}
          </button>
        )
      })}
    </div>
  )
}

/* ── Role picker ── */
const ROLES = [
  { id: 'dom',       label: 'Dominant',    desc: 'You like to lead.' },
  { id: 'sub',       label: 'Submissive',  desc: 'You like to follow.' },
  { id: 'switch',    label: 'Switch',      desc: 'You move between both.' },
  { id: 'exploring', label: 'Exploring',   desc: 'Still figuring it out.' },
]
function RolePicker({ value, onChange }) {
  return (
    <div className="role-grid">
      {ROLES.map(r => {
        const on = value === r.id
        return (
          <button key={r.id} className={`role-card${on ? ' on' : ''}`} onClick={() => onChange(r.id)}>
            <span className="role-ico" style={{ fontSize: 20 }}>
              {r.id === 'dom' ? '🛡' : r.id === 'sub' ? '♥' : r.id === 'switch' ? '⇄' : '🧭'}
            </span>
            <span className="role-text">
              <span className="role-label">{r.label}</span>
              <span className="role-desc">{r.desc}</span>
            </span>
            <span className="role-check">{on && <IcoCheck size={14}/>}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Photo upload ── */
const VIS_OPTS = [
  { v: 'public',    l: 'Public',    I: IcoEye   },
  { v: 'connected', l: 'Connected', I: IcoLink  },
  { v: 'trusted',   l: 'Trusted',   I: IcoShield },
]
function SetupPic({ data, set }) {
  const fileRef  = useRef(null)
  const pendTier = useRef('public')
  const pick     = (tier) => { pendTier.current = tier; fileRef.current?.click() }
  const onFile   = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      const src = URL.createObjectURL(f)
      set('photos', [...data.photos, { id: 's' + Date.now(), seed: 's' + Date.now(), tier: pendTier.current, src }])
    }
    e.target.value = ''
  }
  const setTier = (id, tier) => set('photos', data.photos.map(p => p.id === id ? { ...p, tier } : p))
  const remove  = (id)       => set('photos', data.photos.filter(p => p.id !== id))
  const profile = data.photos[0]

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }}/>
      <div className="setup-pic-hero">
        <div className="avatar setup-bigpic" onClick={() => pick('public')} style={{ cursor: 'pointer', width: 104, height: 104, borderRadius: '50%', position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 3px var(--surface-1), 0 0 0 6px var(--teal)' }}>
          {profile?.src
            ? <img src={profile.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <div style={{ position: 'absolute', inset: 0, background: 'var(--teal-dim)', display: 'grid', placeItems: 'center', fontSize: 32 }}>+</div>
          }
          <span className="setup-bigpic-edit"><IcoPlus size={16}/></span>
        </div>
        <div className="setup-pic-note"><IcoLock size={13}/> Your first photo is your profile bubble. You decide who sees it.</div>
      </div>
      {data.photos.length > 0 && (
        <div className="setup-tiles">
          {data.photos.map((p, idx) => (
            <div key={p.id} className="setup-tile">
              {p.src
                ? <img src={p.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <div style={{ position: 'absolute', inset: 0, background: 'var(--teal-dim)' }}/>
              }
              {idx === 0 && <span className="setup-tile-star"><IcoStar size={11}/></span>}
              <button className="setup-tile-x" onClick={() => remove(p.id)}><IcoX size={13}/></button>
              <div className="setup-tile-vis">
                {VIS_OPTS.map(o => (
                  <button key={o.v} className={`stv ${p.tier === o.v ? 'on ' : ''}tier-${o.v}`} title={o.l} onClick={() => setTier(p.id, o.v)}><span/></button>
                ))}
              </div>
            </div>
          ))}
          <button className="setup-add" onClick={() => pick('public')}><IcoPlus size={18}/></button>
        </div>
      )}
    </>
  )
}

/* ── Setup steps ── */
const SETUP_STEPS = [
  { key: 'welcome', eyebrow: 'First, your space',  h: "Let's set up your space.",         p: "A few quick choices. You control who sees each one — and you can change all of it anytime in Settings." },
  { key: 'photos',  eyebrow: 'Your photos',         h: 'Add a photo, or stay anonymous.',  p: 'Every photo carries its own visibility. Set who can see each — Public, Connected, or Trusted.' },
  { key: 'role',    eyebrow: 'How you show up',     h: "What's your role?",                p: "This helps us suggest people you'll click with. It's never public unless you choose." },
  { key: 'kinks',   eyebrow: 'Your interests',      h: 'What are you into?',               p: 'Pick a few to start. Only the people you connect with ever see these.' },
  { key: 'bio',     eyebrow: 'In your words',       h: 'Say a little about you.',          p: 'A calm, honest line goes further here than anywhere else.' },
]

function SetupPhase({ onDone, getToken }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ photos: [], role: '', kinks: [], bio: '' })
  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  const s    = SETUP_STEPS[step]
  const last = step === SETUP_STEPS.length - 1

  async function next() {
    /* save to API */
    try {
      const token = await getToken()
      if (data.role || data.kinks.length || data.bio) {
        await fetch(`${API}/api/consent-profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lookingFor: [],
            interests: data.kinks,
            dynamicPreference: data.role ? [data.role] : [],
          }),
        })
      }
      if (data.bio) {
        await fetch(`${API}/api/users/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bio: data.bio }),
        })
      }
    } catch { /* non-blocking */ }
    if (last) onDone()
    else setStep(s => s + 1)
  }

  return (
    <div className="onb-card onb-wide setup-card s-rise">
      <div className="setup-head">
        <div className="setup-progress">
          {SETUP_STEPS.map((_, k) => <i key={k} className={k <= step ? 'on' : ''}/>)}
        </div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{step + 1} / {SETUP_STEPS.length}</span>
      </div>

      <div className="setup-body" key={step}>
        <div className="story-eyebrow s-rise s-rise-1">{s.eyebrow}</div>
        <h2 className="onb-h s-rise s-rise-2" style={{ fontSize: 25 }}>{s.h}</h2>
        <p className="onb-p s-rise s-rise-3" style={{ marginBottom: 18 }}>{s.p}</p>

        <div className="s-rise s-rise-3">
          {s.key === 'welcome' && (
            <div className="setup-welcome">
              {[
                ['Choose what each photo reveals', '👁'],
                ['Your role & interests stay private', '🔒'],
                ['Nothing is public unless you place it there', '✓'],
              ].map(([t, ico], k) => (
                <div key={k} className="setup-assure">
                  <span style={{ fontSize: 16 }}>{ico}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}
          {s.key === 'photos' && <SetupPic data={data} set={set}/>}
          {s.key === 'role'   && <RolePicker value={data.role} onChange={v => set('role', v)}/>}
          {s.key === 'kinks'  && (
            <div>
              <KinkPicker value={data.kinks} onChange={v => set('kinks', v)}/>
              <div className="setup-count muted">{data.kinks.length} selected</div>
            </div>
          )}
          {s.key === 'bio' && (
            <textarea className="ta" rows={4} maxLength={280}
              placeholder="New here and taking it slow. I value people who read the whole profile…"
              value={data.bio} onChange={e => set('bio', e.target.value)}/>
          )}
        </div>
      </div>

      <div className="setup-foot">
        {step > 0
          ? <span className="skip" onClick={() => setStep(s => s - 1)} style={{ cursor: 'pointer' }}>Back</span>
          : <span/>
        }
        <div style={{ flex: 1 }}/>
        {!last && step > 0 && <span className="skip" onClick={next} style={{ marginRight: 4, cursor: 'pointer' }}>Skip</span>}
        <button className="onb-btn" style={{ width: 'auto', margin: 0, padding: '12px 24px' }}
          disabled={s.key === 'role' && !data.role} onClick={next}>
          Continue <IcoArrow size={18}/>
        </button>
      </div>
    </div>
  )
}

/* ── Main onboarding component ── */
export default function OnboardingPage() {
  const { isLoaded, getToken } = useAuth()
  const [phase, setPhase]  = useState('setup')  // 'setup' | 'story'

  if (!isLoaded) return (
    <div className="onb" style={{ display: 'grid', placeItems: 'center' }}>
      <span className="mini-spin" style={{ width: 32, height: 32 }}/>
    </div>
  )

  async function finish() {
    // Final onboarding step: mark the profile complete on the backend, which
    // records onboardingComplete in the user's Clerk publicMetadata — the route
    // guard's source of truth. We then hard-reload so Clerk re-reads the fresh
    // metadata before ProtectedRoute evaluates it; a client-side navigate would
    // race ahead of the metadata refresh and bounce the user back to onboarding.
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/consent-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isComplete: true, completedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Failed to finalize onboarding')
    } catch (err) {
      console.error('[onboarding] failed to finalize:', err)
    }
    window.location.replace('/')
  }

  return (
    <div className="onb">
      <svg className="onb-threads" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <path className="t1" d="M-50 200 C 300 120 500 320 760 240 S 1200 120 1500 260"/>
        <path className="t2" d="M-50 460 C 300 380 560 560 820 480 S 1220 360 1500 500"/>
        <path className="t3" d="M-50 700 C 320 640 540 800 820 720 S 1240 620 1500 740"/>
      </svg>

      {phase === 'setup' && (
        <SetupPhase getToken={getToken} onDone={() => setPhase('story')}/>
      )}
      {phase === 'story' && (
        <StoryPhase onDone={finish}/>
      )}
    </div>
  )
}
