import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { ChevronLeft } from 'lucide-react'
import HandshakeStep3 from './HandshakeStep3'
import HandshakeStep4 from './HandshakeStep4'
import styles from './IncomingHandshakePage.module.css'

export default function IncomingHandshakePage() {
  const { handshakeId } = useParams()
  const navigate        = useNavigate()
  const { getToken }    = useAuth()

  const [handshake,  setHandshake]  = useState(null)
  const [accepted,   setAccepted]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [accepting,  setAccepting]  = useState(false)
  const [declining,  setDeclining]  = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch(`/api/handshake/${handshakeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setHandshake(await res.json())
      } catch {
        setError('Could not load this request.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [handshakeId, getToken])

  async function handleAccept() {
    setAccepting(true)
    try {
      const token = await getToken()
      const res   = await fetch(`/api/handshake/${handshakeId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setAccepted(true)
    } catch {
      setError('Failed to accept. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  async function handleDecline() {
    setDeclining(true)
    try {
      const token = await getToken()
      await fetch(`/api/handshake/${handshakeId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate('/', { state: { toast: 'Request declined.' } })
    } catch {
      setError('Failed to decline. Please try again.')
    } finally {
      setDeclining(false)
    }
  }

  // Screen 4 — accepted state (full-screen animation, no nav wrapper)
  if (accepted && handshake) {
    return <HandshakeStep4 initiatorId={handshake.initiatorId} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className={styles.inner}>
        {loading && <LoadingSpinner />}

        {!loading && error && (
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#B8AEE0' }}>{error}</p>
        )}

        {!loading && !error && handshake && (
          <HandshakeStep3
            handshake={handshake}
            onAccept={handleAccept}
            onDecline={handleDecline}
            accepting={accepting}
            declining={declining}
          />
        )}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid #7C3AED', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}
