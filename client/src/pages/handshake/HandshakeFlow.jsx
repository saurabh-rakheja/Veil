import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { ChevronLeft } from 'lucide-react'
import HandshakeStep1 from './HandshakeStep1'
import HandshakeStep2 from './HandshakeStep2'
import HandshakeStep5 from './HandshakeStep5'
import styles from './HandshakeFlow.module.css'

const API = import.meta.env.VITE_API_URL

export default function HandshakeFlow() {
  const { recipientId } = useParams()
  const navigate        = useNavigate()
  const { getToken }    = useAuth()

  const [screen,        setScreen]        = useState(null)   // null=loading | 1 | 2 | 5
  const [recipientName, setRecipientName] = useState('them')
  const [sharedCount,   setSharedCount]   = useState(0)
  const [handshakeId,   setHandshakeId]   = useState(null)
  const [sentMessage,   setSentMessage]   = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [sendError,     setSendError]     = useState('')
  const [loading,       setLoading]       = useState(false)

  // On load, check the recipient profile to determine initial screen
  useEffect(() => {
    async function init() {
      try {
        const token = await getToken()
        const res   = await fetch(`${API}/api/users/${recipientId}/public`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Not found')
        const data = res.ok ? await res.json() : {}

        setRecipientName(data.displayName || 'them')
        setSharedCount((data.sharedInterests ?? []).length)

        if (data.handshakeStatus === 'pending_sent') {
          setHandshakeId(data.handshakeId)
          setScreen(2)
        } else if (data.handshakeStatus === 'cooldown') {
          setCooldownUntil(data.cooldownUntil)
          setScreen(5)
        } else {
          setScreen(1)
        }
      } catch {
        setScreen(1)
      }
    }
    init()
  }, [recipientId, getToken])

  async function handleSend(message) {
    setSendError('')
    setLoading(true)
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/handshake/initiate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ recipientId, introductionMessage: message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error || 'Failed to send request. Please try again.')
        return
      }
      setHandshakeId(data._id)
      setSentMessage(message)
      setScreen(2)
    } catch {
      setSendError('Failed to send request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw(id) {
    const token = await getToken()
    await fetch(`${API}/api/handshake/${id}/withdraw`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  if (screen === null) {
    return (
      <div className={styles.page} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #7C3AED', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtnAbs} onClick={() => navigate(-1)} aria-label="Back">
        <ChevronLeft size={20} />
      </button>

      <div className={styles.inner}>
        {screen === 1 && (
          <HandshakeStep1
            recipientName={recipientName}
            sharedCount={sharedCount}
            onSend={handleSend}
            loading={loading}
            error={sendError}
          />
        )}

        {screen === 2 && (
          <HandshakeStep2
            recipientName={recipientName}
            handshakeId={handshakeId}
            message={sentMessage}
            onWithdraw={handleWithdraw}
          />
        )}

        {screen === 5 && (
          <HandshakeStep5
            recipientName={recipientName}
            cooldownUntil={cooldownUntil}
          />
        )}
      </div>
    </div>
  )
}
