import { useNavigate } from 'react-router-dom'
import styles from './HandshakeFlow.module.css'

function formatDate(date) {
  if (!date) return ''
  const days = Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'soon'
  if (days === 1) return 'in 1 day'
  if (days < 14) return `in ${days} days`
  return `on ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
}

export default function HandshakeStep5({ recipientName, cooldownUntil }) {
  const navigate = useNavigate()
  return (
    <div className={styles.declinedContainer}>
      <h1 className={styles.declinedHeading}>
        Your request to {recipientName} was not accepted.
      </h1>
      <p className={styles.declinedSub}>You can send a new request in 30 days.</p>
      {cooldownUntil && (
        <span className={styles.cooldownChip}>
          Available {formatDate(cooldownUntil)}
        </span>
      )}
      <button className={styles.backDiscoverBtn} style={{ marginTop: 8 }} onClick={() => navigate('/')}>
        Back to discover
      </button>
    </div>
  )
}
