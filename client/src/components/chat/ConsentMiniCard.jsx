import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { ChevronDown, ChevronUp, Hexagon } from 'lucide-react'

export default function ConsentMiniCard({ connectionId }) {
  const { getToken } = useAuth()
  const storageKey   = `consentCard_collapsed_${connectionId}`

  const [collapsed,  setCollapsed]  = useState(() => localStorage.getItem(storageKey) === 'true')
  const [data,       setData]       = useState(null)

  useEffect(() => {
    async function fetchCompat() {
      try {
        const token = await getToken()
        const res   = await fetch(`/api/connections/${connectionId}/compatibility`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setData(await res.json())
      } catch { /* non-critical */ }
    }
    fetchCompat()
  }, [connectionId, getToken])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(storageKey, String(next))
  }

  const interests  = data?.sharedInterests  ?? []
  const score      = data?.compatibilityScore ?? 0
  const updatedAt  = data?.snapshotTakenAt
    ? new Date(data.snapshotTakenAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  const visibleTags   = interests.slice(0, 5)
  const hiddenCount   = Math.max(0, interests.length - 5)

  return (
    <div style={{
      borderBottom: '1px solid #2D2450',
      background: '#1A1530',
    }}>
      {/* Collapsed strip / toggle row */}
      <button
        onClick={toggle}
        style={{
          width: '100%',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'transparent',
          cursor: 'pointer',
        }}
        aria-expanded={!collapsed}
        aria-label="Toggle compatibility card"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Hexagon size={14} color="#A78BFA" />
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#B8AEE0' }}>
            What you have in common
          </span>
        </span>
        {collapsed
          ? <ChevronDown size={14} color="#6B5FA6" />
          : <ChevronUp   size={14} color="#6B5FA6" />
        }
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Compatibility score */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: 'ClashDisplay, sans-serif',
              fontSize: 36,
              fontWeight: 500,
              color: '#F7F4FF',
              lineHeight: 1,
            }}>
              {score}
            </span>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#B8AEE0' }}>
              % compatible
            </span>
          </div>

          {/* Shared interest tags */}
          {visibleTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {visibleTags.map(tag => (
                <span key={tag} style={{
                  background: '#22C55E',
                  color: '#fff',
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 9999,
                }}>
                  {tag}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span style={{
                  background: '#1A1530',
                  border: '1px solid #2D2450',
                  color: '#6B5FA6',
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 9999,
                }}>
                  +{hiddenCount} more
                </span>
              )}
            </div>
          )}

          {interests.length === 0 && (
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#6B5FA6' }}>
              No shared interests recorded.
            </span>
          )}

          {/* Updated date */}
          {updatedAt && (
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 10, color: '#6B5FA6' }}>
              Updated {updatedAt}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
