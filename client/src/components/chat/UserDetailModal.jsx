import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, AlertOctagon } from 'lucide-react'
import { toSvg } from 'jdenticon'
import styles from './UserDetailModal.module.css'

const API = import.meta.env.VITE_API_URL

export default function UserDetailModal({ userId, onClose, onReport }) {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const overlayRef = useRef(null)
  const [compatWidth, setCompatWidth] = useState(0)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = await getToken()
        const res = await fetch(`${API}/api/users/${userId}/public`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setProfile(await res.json())
      } catch (err) {
        console.error('[UserDetailModal] fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [userId, getToken])

  // Animate compat bar after profile loads
  useEffect(() => {
    if (!profile) return
    const t = setTimeout(() => setCompatWidth(profile.compatibilityScore ?? 0), 80)
    return () => clearTimeout(t)
  }, [profile])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  const avatarSvg = { __html: toSvg(userId, 64) }

  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="User profile"
    >
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {loading ? (
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div
              className={styles.avatar}
              dangerouslySetInnerHTML={avatarSvg}
            />

            {/* Display name */}
            <p className={styles.displayName}>
              {profile?.displayName || <em>Anonymous</em>}
            </p>

            {/* Pronouns */}
            {profile?.pronouns && (
              <p className={styles.pronouns}>{profile.pronouns}</p>
            )}

            {/* City */}
            {profile?.city && (
              <p className={styles.city}>
                <MapPin size={14} />
                {profile.city}
              </p>
            )}

            <div className={styles.divider} />

            {/* Experience level */}
            {profile?.experienceLevel && (
              <div className={styles.chipRow}>
                <span className={styles.chip}>{profile.experienceLevel}</span>
              </div>
            )}

            {/* Looking for tags */}
            {profile?.lookingFor?.length > 0 && (
              <div className={styles.tagRow}>
                {profile.lookingFor.slice(0, 4).map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
                {profile.lookingFor.length > 4 && (
                  <span className={styles.tag}>+{profile.lookingFor.length - 4} more</span>
                )}
              </div>
            )}

            {/* Compatibility */}
            <p className={styles.compatText}>
              {profile?.compatibilityScore ?? 0}% compatible with you
            </p>
            <div className={styles.compatTrack}>
              <div
                className={styles.compatFill}
                style={{ width: `${compatWidth}%` }}
              />
            </div>

            {/* Member since */}
            {memberSince && (
              <p className={styles.memberSince}>Member since {memberSince}</p>
            )}

            <div className={styles.divider} />

            {/* Actions */}
            <button
              className={styles.viewProfileBtn}
              onClick={() => { navigate(`/profile/${userId}`); onClose() }}
            >
              View full profile
            </button>

            <button className={styles.reportBtn} onClick={onReport}>
              <AlertOctagon size={14} />
              Report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
