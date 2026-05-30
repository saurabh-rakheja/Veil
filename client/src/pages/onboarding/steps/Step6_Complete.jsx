import { useState } from 'react'
import { User, Compass, Info } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import styles from './Steps.module.css'

export default function Step6_Complete() {
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleEnterLoom = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      console.log('[Step6] marking profile complete...')
      const token = await getToken()
      const res = await fetch('/api/consent-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isComplete: true,
          completedAt: new Date().toISOString(),
        }),
      })

      const data = await res.json()
      console.log('[Step6] PATCH response:', res.status, JSON.stringify(data))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      if (!data.profile?.isComplete) {
        throw new Error('Profile saved but isComplete is still false')
      }

      console.log('[Step6] success — reloading to /')
      window.location.replace('/')
    } catch (err) {
      console.error('[Step6] error:', err)
      setSaveError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.step6}>
      <h1 className={styles.completeHeading}>You're in.</h1>
      <div className={styles.completeLine} />
      <p className={styles.completeSubtext}>
        Every new Loom member is personally welcomed by the founding team.
      </p>

      <div className={styles.suggestionCards}>
        <button className={styles.suggestionCard} onClick={() => console.log('navigate to profile')}>
          <User size={20} className={styles.suggestionIcon} />
          <div>
            <p className={styles.suggestionTitle}>Complete your profile</p>
            <p className={styles.suggestionDesc}>Add a display name and city</p>
          </div>
        </button>
        <button className={styles.suggestionCard} onClick={() => console.log('navigate to community')}>
          <Compass size={20} className={styles.suggestionIcon} />
          <div>
            <p className={styles.suggestionTitle}>Browse the community</p>
            <p className={styles.suggestionDesc}>See who else is here</p>
          </div>
        </button>
        <button className={styles.suggestionCard} onClick={() => console.log('navigate to how handshakes work')}>
          <Info size={20} className={styles.suggestionIcon} />
          <div>
            <p className={styles.suggestionTitle}>How handshakes work</p>
            <p className={styles.suggestionDesc}>Learn how to connect safely</p>
          </div>
        </button>
      </div>

      {saveError && (
        <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
          {saveError}
        </p>
      )}

      <button
        className={styles.continueBtn}
        onClick={handleEnterLoom}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Enter Loom'}
      </button>
    </div>
  )
}
