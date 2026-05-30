import { ExternalLink } from 'lucide-react'
import styles from './SafetyPage.module.css'

const CONSENT_LINKS = [
  {
    title: 'The Consent Academy',
    url:   'https://www.consentacademy.com',
    desc:  'Resources, workshops, and education on consent culture.',
  },
  {
    title: 'NCSF — National Coalition for Sexual Freedom',
    url:   'https://ncsfreedom.org',
    desc:  'Advocacy and support for consenting adults in alternative lifestyles.',
  },
  {
    title: 'Kink Aware Professionals',
    url:   'https://www.kinkaware.net',
    desc:  'Directory of therapists and professionals familiar with kink communities.',
  },
]

const CRISIS_LINKS = [
  {
    title: 'Crisis Text Line',
    url:   'https://www.crisistextline.org',
    desc:  'Text HOME to 741741 — free, confidential crisis support (UK & US).',
  },
  {
    title: 'Mind (UK)',
    url:   'https://www.mind.org.uk',
    desc:  'Mental health information, advice, and local support across England and Wales.',
  },
  {
    title: 'Samaritans (UK & Ireland)',
    url:   'https://www.samaritans.org',
    desc:  'Free to call 24/7: 116 123 — listening support for anyone in distress.',
  },
  {
    title: 'iCall (India)',
    url:   'https://icallhelpline.org',
    desc:  'Counselling and support — 9152987821 — provided by TISS, India.',
  },
]

function ResourceCard({ title, url, desc }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{title}</span>
        <ExternalLink size={14} className={styles.cardIcon} />
      </div>
      <p className={styles.cardDesc}>{desc}</p>
    </a>
  )
}

export default function SafetyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <h1 className={styles.heroHeading}>Your safety matters</h1>
          <p className={styles.heroSub}>
            Resources, guidance, and support for navigating consent and alternative lifestyles safely.
          </p>
        </div>

        {/* ── Section 1 — Consent & Safety ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Understanding consent</h2>
          <div className={styles.cards}>
            {CONSENT_LINKS.map(r => (
              <ResourceCard key={r.url} {...r} />
            ))}
          </div>
        </section>

        {/* ── Section 2 — Mental Health ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Mental health support</h2>
          <div className={styles.cards}>
            {CRISIS_LINKS.map(r => (
              <ResourceCard key={r.url} {...r} />
            ))}
          </div>
        </section>

        {/* ── Section 3 — How Loom Protects You ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>How Loom works to protect you</h2>
          <ul className={styles.bulletList}>
            <li className={styles.bullet}>
              Phone verification ensures every account is a real person
            </li>
            <li className={styles.bullet}>
              The consent handshake means no one can contact you without your agreement
            </li>
            <li className={styles.bullet}>
              Every connection begins with a mutual, logged consent record
            </li>
            <li className={styles.bullet}>
              Report anything with one tap — our team reviews every report
            </li>
          </ul>
        </section>

        {/* ── Footer note ── */}
        <p className={styles.emergency}>
          If you are in immediate danger, please contact local emergency services.
        </p>

      </div>
    </div>
  )
}
