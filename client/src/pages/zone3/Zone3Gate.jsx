import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Lock } from 'lucide-react'
import styles from './Zone3Gate.module.css'

export default function Zone3Gate() {
  const navigate    = useNavigate()
  const { getToken } = useAuth()

  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleEnable() {
    if (!checked || loading) return
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res   = await fetch('/api/users/zone3-opt-in', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to enable Zone 3 access.')
      navigate('/zone3', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Lock size={48} className={styles.lockIcon} aria-hidden="true" />

        <h1 className={styles.heading}>Explicit content zone</h1>

        <p className={styles.body}>
          You're about to enable access to Zone 3 — the explicit content area of Loom.
          This zone contains adult content intended for verified members who have chosen to access it.
        </p>

        <p className={styles.body}>
          By continuing, you confirm that: you are 18 years of age or older, you are not
          accessing this from a jurisdiction where such content is prohibited, and you consent
          to viewing explicit content on this platform.
        </p>

        <p className={styles.body}>
          This choice is logged. You can disable access to this zone at any time from your settings.
        </p>

        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
          />
          <span className={styles.checkText}>
            I confirm I am 18+ and consent to accessing explicit content.
          </span>
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <button
          className={styles.enableBtn}
          onClick={handleEnable}
          disabled={!checked || loading}
        >
          {loading ? 'Enabling…' : 'Enable Zone 3 access'}
        </button>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          No thanks, go back
        </button>
      </div>
    </div>
  )
}
