import { useState } from 'react'
import styles from './Steps.module.css'

const FIELDS = [
  { key: 'displayName',    label: 'Display name' },
  { key: 'city',           label: 'City' },
  { key: 'experienceLevel', label: 'Experience level' },
  { key: 'lookingFor',     label: 'What I\'m looking for' },
  { key: 'interests',      label: 'My interests' },
  { key: 'limits',         label: 'My limits' },
]

const DEFAULTS = {
  displayName:    'public',
  city:           'connected',
  experienceLevel: 'connected',
  lookingFor:     'connected',
  interests:      'connected',
  limits:         'trusted',
}

const SEGMENTS = ['public', 'connected', 'trusted']

function SegmentedControl({ value, onChange }) {
  return (
    <div className={styles.segmented}>
      {SEGMENTS.map(opt => (
        <button
          key={opt}
          className={`${styles.segment} ${value === opt ? styles.segmentActive : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  )
}

export default function Step5_Visibility({ data, onContinue }) {
  const [settings, setSettings] = useState({
    ...DEFAULTS,
    ...(data.visibilitySettings ?? {}),
  })

  function update(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div>
      <h1 className={styles.heading}>Control who sees what</h1>
      <p className={styles.sub}>Everything is private by default. You choose what to reveal and to whom.</p>

      {/* Concentric rings diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <svg width="160" height="80" viewBox="0 0 160 80" aria-hidden="true">
          {/* Outer — Public */}
          <path d="M 4,80 A 76,76 0 0,1 156,80" stroke="#2D2450" strokeWidth="1.5" fill="none" />
          <text x="80" y="16" textAnchor="middle" fill="#2D2450" fontSize="9" fontFamily="Satoshi, sans-serif">Public</text>
          {/* Middle — Connected */}
          <path d="M 26,80 A 54,54 0 0,1 134,80" stroke="#6B5FA6" strokeWidth="1.5" fill="none" />
          <text x="80" y="36" textAnchor="middle" fill="#6B5FA6" fontSize="9" fontFamily="Satoshi, sans-serif">Connected</text>
          {/* Inner — Trusted */}
          <path d="M 50,80 A 30,30 0 0,1 110,80" stroke="#A78BFA" strokeWidth="1.5" fill="none" />
          <text x="80" y="60" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily="Satoshi, sans-serif">Trusted</text>
        </svg>
      </div>

      <div className={styles.visibilityTable}>
        {FIELDS.map(({ key, label }) => (
          <div key={key} className={styles.visibilityRow}>
            <span className={styles.visibilityLabel}>{label}</span>
            <SegmentedControl value={settings[key]} onChange={val => update(key, val)} />
          </div>
        ))}
      </div>

      <p className={styles.visibilityFooter}>You can change these at any time from your settings.</p>

      <button
        className={styles.continueBtn}
        onClick={() => onContinue({ visibilitySettings: settings })}
      >
        Save &amp; continue
      </button>
      <p className={styles.stepIndicator}>5 of 6</p>
    </div>
  )
}
