import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import styles from './Zone3Page.module.css'

const API = import.meta.env.VITE_API_URL

export default function Zone3Page() {
  const navigate    = useNavigate()
  const { getToken } = useAuth()
  const [checking, setChecking] = useState(true)

  // Verify zone3OptedIn before rendering anything
  useEffect(() => {
    async function verify() {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { profile } = await res.json()
          if (!profile?.zone3OptedIn) {
            navigate('/zone3/enable', { replace: true })
            return
          }
        } else {
          navigate('/zone3/enable', { replace: true })
          return
        }
      } catch {
        navigate('/zone3/enable', { replace: true })
        return
      }
      setChecking(false)
    }
    verify()
  }, [getToken, navigate])

  if (checking) return null

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Zone 3</h1>
        <p className={styles.body}>
          This area is coming soon. Content is being reviewed before launch.
        </p>
        <p className={styles.note}>
          Zone 3 content will be enabled once our content moderation system is fully operational.
        </p>
      </div>
    </div>
  )
}
