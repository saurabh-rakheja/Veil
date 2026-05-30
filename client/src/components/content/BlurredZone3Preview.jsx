import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import styles from './BlurredZone3Preview.module.css'

export default function BlurredZone3Preview({ blurHash, contentId }) {
  const navigate = useNavigate()
  return (
    <div
      className={styles.container}
      onClick={() => navigate('/zone3/enable')}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate('/zone3/enable')}
      aria-label="Enable Zone 3 to view this content"
    >
      <Lock size={24} className={styles.icon} />
      <span className={styles.label}>Zone 3 content</span>
      <span className={styles.cta}>Enable in settings to view</span>
    </div>
  )
}
