import { useNavigate } from 'react-router-dom'

function Fig({ seed, t, d, cls = '' }) {
  return (
    <figure className={`about-fig ${cls}`} style={{ margin: 0 }}>
      <div className="about-fig-art" style={{ background: `linear-gradient(135deg, var(--teal-deep), var(--surface-2))` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,19,15,0.3)' }}/>
      </div>
      <figcaption className="about-fig-cap">
        <div className="t">{t}</div>
        <div className="d">{d}</div>
      </figcaption>
    </figure>
  )
}

const PRINCIPLES = [
  { icon: '🤝', c: 'var(--teal)',   h: 'Consent as architecture',
    p: "Two people can't message until both complete a consent handshake. Safety is mechanical, not a policy you hope others honour." },
  { icon: '👁', c: 'var(--violet)', h: 'Privacy as the default',
    p: 'Nothing about you is public by default. Three visibility tiers — Public, Connected, Trusted — unlock only through mutual choice.' },
  { icon: '✓',  c: 'var(--gold)',   h: 'Verified, yet anonymous',
    p: "Every member is a real, age-verified adult. None of that identity is ever shown. Accountability behind the scenes, anonymity in front." },
  { icon: '★',  c: 'var(--rose)',   h: 'Trust as currency',
    p: "Members vouch for people they've actually met. Reputation is earned and revocable — mirroring how trust works in real communities." },
  { icon: '📅', c: 'var(--teal)',   h: 'Built around real life',
    p: 'Munches, workshops and meetups are first-class. Connection grows from shared experience, not cold browsing.' },
  { icon: '🌐', c: 'var(--gold)',   h: 'The right content, in context',
    p: 'Three zones — a public commons, a members area, and an opt-in explicit zone — keep everything where it belongs.' },
]

const BENEFITS = [
  { icon: '✨', c: 'var(--teal)',   h: 'The newly curious',
    p: 'A calm, private first step. Explore, learn, and build one real connection before anything else — with no pressure and no exposure.' },
  { icon: '🔒', c: 'var(--violet)', h: 'The privacy-conscious',
    p: 'Total control over what you reveal and to whom, plus disappearing media and screenshot protection. Take any layer back, anytime.' },
  { icon: '👥', c: 'var(--gold)',   h: 'Experienced members',
    p: 'Verification of the people you meet, structured compatibility, and a vouching system that finally reflects real-world trust.' },
]

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="about">
        {/* Hero */}
        <header className="about-hero rise">
          <div className="about-hero-art" style={{ background: 'linear-gradient(135deg, var(--teal-deep), var(--surface-0))' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(7,20,26,0.86) 30%, rgba(7,20,26,0.4))' }}/>
          </div>
          <div className="about-hero-inner">
            <div className="about-eyebrow">About Loom</div>
            <h1>Trust, built into the architecture.</h1>
            <p>Loom is a consent-first social platform for adults exploring alternative relationships and intimacy — designed so that safety isn't a promise you have to trust, but a system that protects you by default.</p>
            <div className="about-tagrow">
              <span className="about-tag">✓ Consent-first</span>
              <span className="about-tag">🔒 Private by default</span>
              <span className="about-tag">♥ Built for humans</span>
            </div>
          </div>
        </header>

        {/* Why */}
        <section className="about-section">
          <div className="about-kicker">Why we built Loom</div>
          <h2>Safe spaces shouldn't be the exception.</h2>
          <p className="about-lead">Millions of thoughtful adults are curious about kink, ethical non-monogamy, and alternative intimacy. The places to explore them, though, tend to feel exposing, outdated, or hostile to anyone new.</p>
          <p className="body">Most platforms were built open by default — no real identity layer, no structured way to establish trust before someone reaches you. For a space this personal, that's backwards. Fear of exposure and unsolicited contact keeps the most thoughtful people out entirely.</p>
          <p className="body">So we started from a different premise: <b>privacy and safety shouldn't be settings you hunt for — they should be the ground the whole platform stands on.</b> Every interaction on Loom begins with declared, mutual consent. Nothing about you surfaces until you decide it should.</p>
          <blockquote className="pullquote">
            The technology enforces the safety. <span>You don't have to rely on goodwill alone.</span>
          </blockquote>
        </section>

        <Fig t="Discovery, without exposure" d="Browse verified people freely — no one sees that you looked, and no one can reach you uninvited." cls="tall"/>

        {/* How */}
        <section className="about-section">
          <div className="about-kicker">How Loom works</div>
          <h2>Six commitments, woven together.</h2>
          <p className="body">These aren't features bolted on after launch — they're structural. Each one would require rebuilding a social model from scratch to copy, because together they <b>change what the platform is</b>.</p>
          <div className="princ-grid">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="princ">
                <div className="princ-ico" style={{ color: p.c, background: `color-mix(in srgb, ${p.c} 15%, transparent)`, fontSize: 20 }}>{p.icon}</div>
                <h3>{p.h}</h3>
                <p>{p.p}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="fig-grid">
          <Fig t="A handshake before a hello" d="No cold messages. Ever."/>
          <Fig t="You control every layer" d="Reveal — and revoke — on your terms."/>
        </div>

        {/* Who */}
        <section className="about-section">
          <div className="about-kicker">Who Loom is for</div>
          <h2>Built for how people actually build trust.</h2>
          <div style={{ marginTop: 14 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} className="benefit">
                <div className="benefit-ico" style={{ color: b.c, background: `color-mix(in srgb, ${b.c} 15%, transparent)`, fontSize: 22 }}>{b.icon}</div>
                <div><h3>{b.h}</h3><p>{b.p}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="about-close">
          <div className="about-close-art" style={{ background: 'linear-gradient(135deg, var(--teal-deep), var(--surface-0))' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,26,0.72)' }}/>
          </div>
          <div className="about-close-inner">
            <h2>Safe. Consensual. Human.</h2>
            <p>Loom succeeds not when it has the most members, but when the people here feel genuinely safer, more understood, and more connected than they ever did anywhere else.</p>
            <button className="btn btn-gold" onClick={() => navigate('/discover')}>
              🧭 Explore discovery
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
