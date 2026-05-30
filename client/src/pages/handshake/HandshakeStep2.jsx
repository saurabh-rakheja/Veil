import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HandshakeFlow.module.css'

export default function HandshakeStep2({ recipientName, handshakeId, message, onWithdraw }) {
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  async function confirmWithdraw() {
    setWithdrawing(true)
    try {
      await onWithdraw(handshakeId)
      navigate(-1)
    } finally {
      setWithdrawing(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className={styles.sentContainer}>
        <div className={styles.orb} aria-hidden="true" />
        <h1 className={styles.sentHeading}>Your request is with {recipientName}.</h1>
        <p className={styles.sentSub}>They'll be notified. Requests expire after 7 days.</p>

        <div className={styles.messageCard}>
          <p className={styles.messageCardLabel}>Your introduction</p>
          <p className={styles.messageCardText}>{message}</p>
        </div>

        <button className={styles.withdrawLink} onClick={() => setShowConfirm(true)}>
          Withdraw this request
        </button>

        <button className={styles.backDiscoverBtn} onClick={() => navigate('/')}>
          Back to discover
        </button>
      </div>

      {showConfirm && (
        <div className={styles.modalBackdrop} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalText}>
              Are you sure you want to withdraw? If {recipientName} declines later, you'll need to wait 30 days before sending again.
            </p>
            <button className={styles.modalConfirmBtn} onClick={confirmWithdraw} disabled={withdrawing}>
              {withdrawing ? 'Withdrawing…' : 'Yes, withdraw'}
            </button>
            <button className={styles.modalCancelBtn} onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
