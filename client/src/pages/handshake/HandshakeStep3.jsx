import { useState, useEffect } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import styles from './IncomingHandshakePage.module.css'

function CompatBarInner({ score, conflictCount }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 80)
    return () => clearTimeout(t)
  }, [score])
  const conflictWidth = conflictCount > 0 ? Math.min(Math.max(conflictCount * 4, 12), 20) : 0
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${width}%` }} />
      {conflictWidth > 0 && <div className={styles.barConflict} style={{ width: `${conflictWidth}%` }} />}
    </div>
  )
}

function LoadingDots() {
  return (
    <span className={styles.dots} aria-label="Loading">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  )
}

export default function HandshakeStep3({
  handshake, onAccept, onDecline, accepting, declining,
}) {
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [showProfileOverlay, setShowProfileOverlay] = useState(false)

  const {
    otherUser = {}, introductionMessage,
    compatibilityScore = 0, limitConflicts = [], sharedInterests = [],
  } = handshake

  const name = otherUser.displayName?.trim() || 'Someone'

  return (
    <>
      <h1 className={styles.heading}>
        {name} would like to connect with you.
      </h1>

      {/* Introduction card */}
      <div className={styles.messageCard}>
        <p className={styles.messageLabel}>{name} wrote</p>
        <p className={styles.messageText}>{introductionMessage}</p>
      </div>

      {/* Compatibility */}
      <div className={styles.compatPanel}>
        <div className={styles.compatRow}>
          <span className={styles.compatLabel}>Compatibility</span>
          <span className={styles.compatScore}>{compatibilityScore}%</span>
        </div>
        <CompatBarInner score={compatibilityScore} conflictCount={limitConflicts.length} />

        {sharedInterests.length > 0 && (
          <>
            <p className={styles.sharedHeading}>Interests in common</p>
            <div className={styles.sharedChips}>
              {sharedInterests.map(t => (
                <span key={t} className={styles.sharedChip}>{t}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Conflicts */}
      {limitConflicts.length > 0 && (
        <div className={styles.conflictCard}>
          <div className={styles.conflictTitle}>
            <AlertTriangle size={14} color="#F59E0B" />
            Potential compatibility conflict
          </div>
          {limitConflicts.map(tag => (
            <p key={tag} className={styles.conflictItem}>Their interest in <strong>{tag}</strong> overlaps with your stated limit</p>
          ))}
        </div>
      )}

      {/* View profile */}
      <button className={styles.viewProfileBtn} onClick={() => setShowProfileOverlay(true)}>
        <ExternalLink size={14} />
        View their profile
      </button>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.acceptBtn} onClick={onAccept} disabled={accepting || declining}>
          {accepting ? <LoadingDots /> : 'Accept connection'}
        </button>
        <button className={styles.declineBtn} onClick={() => setShowDeclineConfirm(true)} disabled={accepting || declining}>
          Not now
        </button>
      </div>

      {/* Decline confirm modal */}
      {showDeclineConfirm && (
        <div className={styles.modalBackdrop} onClick={() => setShowDeclineConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalText}>
              Are you sure? They won't be told why.
            </p>
            <button
              className={styles.modalConfirmBtn}
              onClick={() => { setShowDeclineConfirm(false); onDecline() }}
              disabled={declining}
            >
              Yes, decline
            </button>
            <button className={styles.modalCancelBtn} onClick={() => setShowDeclineConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile overlay */}
      {showProfileOverlay && (
        <ProfileOverlay user={otherUser} onClose={() => setShowProfileOverlay(false)} />
      )}
    </>
  )
}

function ProfileOverlay({ user, onClose }) {
  return (
    <div className={styles.overlayBackdrop} onClick={onClose}>
      <div className={styles.overlay} onClick={e => e.stopPropagation()}>
        <div className={styles.overlayHandle} />
        <button className={styles.overlayCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 16, fontWeight: 600, color: '#F7F4FF' }}>
          {user.displayName || 'Anonymous'}
        </p>
        {user.city && (
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#B8AEE0' }}>{user.city}</p>
        )}
        {user.experienceLevel && (
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#A78BFA' }}>{user.experienceLevel}</p>
        )}
        {user.lookingFor?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {user.lookingFor.map(v => (
              <span key={v} style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, background: '#2D2450', color: '#B8AEE0', borderRadius: 9999, padding: '3px 10px' }}>{v}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
