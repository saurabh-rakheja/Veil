import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ────────────────────────────────────────────────────────────────────
   Identity art — deterministic gradient mesh + woven thread overlay
   Ports the design's WovenArt / AnonymousArt from data.jsx exactly
──────────────────────────────────────────────────────────────────── */
function seedHash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}
function palette(seed) {
  const h  = seedHash(seed)
  const h1 = h % 360
  const h2 = (h1 + 40 + (h >> 3) % 80) % 360
  return { a: `hsl(${h1} 70% 58%)`, b: `hsl(${h2} 72% 52%)`, c: `hsl(${(h1 + 180) % 360} 60% 46%)`, h1 }
}

function WovenArt({ seed = 'x', round = false }) {
  const p  = palette(seed)
  const id = 'w' + seedHash(seed)
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `
        radial-gradient(120% 100% at 18% 12%, ${p.a}, transparent 55%),
        radial-gradient(120% 110% at 88% 22%, ${p.b}, transparent 52%),
        radial-gradient(120% 120% at 60% 100%, ${p.c}, transparent 60%),
        linear-gradient(135deg, ${p.a}, ${p.b})`,
      borderRadius: round ? '50%' : 0,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.55 }}>
        <defs>
          <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${p.h1 % 90})`}>
            <path d="M0 3.5h7M3.5 0v7" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`}/>
      </svg>
    </div>
  )
}

function AnonymousArt() {
  const id = 'an' + Math.random().toString(36).slice(2, 7)
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(135% 125% at 28% 16%, color-mix(in srgb, var(--teal) 34%, transparent), transparent 64%), linear-gradient(155deg, var(--surface-2), var(--surface-3))',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 4.5h9M4.5 0v9" stroke="var(--line-2)" strokeWidth="0.7" fill="none"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`} opacity="0.5"/>
        <g fill="var(--text-hi)" opacity="0.42">
          <circle cx="50" cy="39" r="14"/>
          <path d="M22 88c0-16 12.5-25 28-25s28 9 28 25z"/>
        </g>
      </svg>
    </div>
  )
}

/* Circular woven avatar (matches design's Avatar component) */
function WovenAvatar({ seed, size = 62, ring = false, ringColor }) {
  const initial = (seed || '?').trim().charAt(0).toUpperCase()
  const rc = ringColor || palette(seed || 'x').a
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div className="avatar" style={{
        width: size, height: size,
        boxShadow: ring ? `0 0 0 2px var(--surface-1), 0 0 0 4px ${rc}` : 'none',
      }}>
        <WovenArt seed={seed || 'x'} round/>
        <span className="glyph" style={{ fontSize: size * 0.42, position: 'relative', zIndex: 1,
          textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{initial}</span>
      </div>
    </div>
  )
}

/* Real photo avatar */
function PhotoAvatar({ userId, size = 62, ring = false, ringColor }) {
  const rc = ringColor || 'var(--teal)'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div className="avatar" style={{
        width: size, height: size,
        boxShadow: ring ? `0 0 0 2px var(--surface-1), 0 0 0 4px ${rc}` : 'none',
      }}>
        <img src={`/api/media/${userId}/avatar`} alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
      </div>
    </div>
  )
}

/* Tier colors & labels */
const TIER_COLOR = { public: 'var(--tier-public)', connected: 'var(--tier-connected)', trusted: 'var(--tier-trusted)' }
const TIER_LABEL = { public: 'Public', connected: 'Connected', trusted: 'Trusted' }

function tierFromVerification(v) {
  if (v === 'id_verified')    return 'trusted'
  if (v === 'phone_verified') return 'connected'
  return 'public'
}

function TierPill({ tier = 'public' }) {
  return (
    <span className={`tier tier-${tier}`}>
      <span className="dot"/>
      {TIER_LABEL[tier]}
    </span>
  )
}

/* Looking-for labels */
const LF_LABELS = {
  genuine_connection:    'Genuine connection',
  community_friendship:  'Community & friendship',
  exploration_curiosity: 'Exploration & curiosity',
  relationship:          'A relationship',
  finding_my_people:     'Finding my people',
  not_sure:              'Not sure yet',
}
const EXP_LABELS = {
  curious_exploring: 'Newly curious',
  some_experience:   'Exploring',
  experienced:       'Experienced',
  deeply_embedded:   'Deep community roots',
}

/* ── The Card ────────────────────────────────────────────────────── */
export default function ProfileCard({ user, index = 0, onOpen }) {
  const { userId, displayName, city, experienceLevel, lookingFor = [],
          verificationTier, compatibilityScore = 0, limitConflicts = [],
          hasProfilePhoto } = user

  const alias    = displayName?.trim() || 'Anonymous'
  const tier     = tierFromVerification(verificationTier)
  const ringCol  = TIER_COLOR[tier]
  const expLabel = EXP_LABELS[experienceLevel] ?? null
  const tags     = lookingFor.slice(0, 3)
  const isVerified = verificationTier === 'phone_verified' || verificationTier === 'id_verified'

  return (
    <div
      className="card disc-card rise"
      style={{ animationDelay: (index * 55) + 'ms' }}
      onClick={() => onOpen && onOpen(user)}
    >
      {/* ── Media area (WovenArt identity or photo) ── */}
      <div className="disc-media">
        {hasProfilePhoto
          ? <img src={`/api/media/${userId}/avatar`} alt={alias}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <AnonymousArt/>
        }
        {!hasProfilePhoto && (
          <span className="media-anon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            Unlocks when connected
          </span>
        )}
        <div className="media-top">
          <div style={{ flex: 1 }}/>
          {compatibilityScore > 0 && (
            <span className="media-match">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/>
              </svg>
              {compatibilityScore}%
            </span>
          )}
        </div>
      </div>

      {/* ── Floating avatar (WovenArt seeded by userId) ── */}
      <div className="disc-avatar">
        {hasProfilePhoto
          ? <PhotoAvatar userId={userId} size={62} ring ringColor={ringCol}/>
          : <WovenAvatar seed={userId} size={62} ring ringColor={ringCol}/>
        }
      </div>

      {/* ── Card body ── */}
      <div className="disc-body">
        {/* Name + tier */}
        <div className="disc-head">
          <div style={{ minWidth: 0 }}>
            <div className="disc-alias">{alias}</div>
            {city && <div className="disc-sub">{city}</div>}
          </div>
          <TierPill tier={tier}/>
        </div>

        {/* Bio placeholder — shown as muted line since card data has no bio */}
        {expLabel && (
          <p className="disc-bio" style={{ color: 'var(--text-lo)', fontStyle: 'italic' }}>
            {expLabel}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="disc-tags">
            {tags.map(v => (
              <span key={v} className="chip sm"
                style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-line)', color: 'var(--text)' }}>
                {LF_LABELS[v] ?? v}
              </span>
            ))}
          </div>
        )}

        {/* Trust row */}
        <div className="disc-trust">
          <span className="badge-verify">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            {isVerified ? 'Verified' : 'Unverified'}
          </span>
          {compatibilityScore > 0 && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: compatibilityScore >= 80 ? 'var(--teal)' : 'var(--gold)' }}>
              {compatibilityScore}% match
            </span>
          )}
        </div>

        {/* Action button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={e => { e.stopPropagation(); onOpen && onOpen(user) }}
        >
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 16l2.5 2.5a1.4 1.4 0 0 0 2-2L14 12"/><path d="M3 11l4-4 4 2 3-3 7 7-3 3-4-2"/><path d="M3 11l3 3"/>
            </svg>
            Request connection
          </>
        </button>
      </div>
    </div>
  )
}

/* ── Export identity utilities for the popup ── */
export { WovenArt, AnonymousArt, WovenAvatar, PhotoAvatar, TierPill, LF_LABELS, EXP_LABELS, TIER_COLOR, tierFromVerification }
