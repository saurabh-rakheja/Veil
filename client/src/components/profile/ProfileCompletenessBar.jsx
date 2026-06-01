import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

const API = import.meta.env.VITE_API_URL

const WEIGHTS = { displayName: 20, city: 20, bio: 15, interests: 25, limits: 20 }
const LABELS  = { displayName: 'display name', city: 'city', bio: 'bio', interests: '3+ interests', limits: '1+ limit' }

function score({ displayName, city, bio, interests, limits }) {
  let t = 0
  if (displayName?.trim())           t += WEIGHTS.displayName
  if (city?.trim())                   t += WEIGHTS.city
  if (bio?.trim())                    t += WEIGHTS.bio
  if ((interests ?? []).length >= 3)  t += WEIGHTS.interests
  if ((limits    ?? []).length >= 1)  t += WEIGHTS.limits
  return t
}

function missing({ displayName, city, bio, interests, limits }) {
  const items = []
  if (!displayName?.trim())           items.push('displayName')
  if (!city?.trim())                  items.push('city')
  if (!bio?.trim())                   items.push('bio')
  if ((interests ?? []).length < 3)   items.push('interests')
  if ((limits    ?? []).length < 1)   items.push('limits')
  return items
}

export default function ProfileCompletenessBar() {
  const { getToken } = useAuth()
  const [pct,  setPct]  = useState(null)
  const [gaps, setGaps] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const token   = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [profileRes, consentRes] = await Promise.all([
          fetch(`${API}/api/users/profile`,   { headers }),
          fetch(`${API}/api/consent-profile`, { headers }),
        ])
        const p = profileRes.ok ? (await profileRes.json()).profile  || {} : {}
        const c = consentRes.ok ? (await consentRes.json()).profile  || {} : {}
        const data = { displayName: p.displayName, city: p.city, bio: p.bio, interests: c.interests, limits: c.limits }
        setPct(score(data))
        setGaps(missing(data))
      } catch { /* silently fail */ }
    }
    fetchData()
  }, [getToken])

  if (pct === null || pct === 100) return null

  const barCol = pct >= 80 ? 'var(--teal-bright)' : pct >= 50 ? 'var(--teal)' : 'var(--gold)'

  return (
    <Link to="/settings" style={{ textDecoration: 'none', display: 'block', marginBottom: 18 }}>
      <div className="card" style={{ padding: '14px 16px', cursor: 'pointer', border: '1px solid var(--teal-line)', background: 'var(--teal-dim)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-hi)' }}>
            Profile {pct}% complete
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>Complete →</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barCol, borderRadius: 99, transition: 'width 400ms ease-out' }}/>
        </div>

        {/* Missing fields */}
        {gaps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {gaps.map(g => (
              <span key={g} className="chip sm" style={{ background: 'var(--surface-2)', color: 'var(--text-lo)', borderColor: 'var(--line)' }}>
                + {LABELS[g]}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
