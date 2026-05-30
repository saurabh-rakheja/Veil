import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, User, Compass } from 'lucide-react'
import styles from './IncomingHandshakePage.module.css'

export default function HandshakeStep4({ initiatorId }) {
  const navigate   = useNavigate()
  const [phase, setPhase] = useState(0)
  // phases: 0=orbs start, 1=orbs move, 2=pulse, 3=text, 4=cards

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150)   // orbs start moving
    const t2 = setTimeout(() => setPhase(2), 500)   // pulse at meeting
    const t3 = setTimeout(() => setPhase(3), 800)   // text fades in
    const t4 = setTimeout(() => setPhase(4), 880)   // cards fade in
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  const actionCards = [
    { icon: <MessageCircle size={18} />, label: 'Start a conversation', onClick: () => navigate('/messages') },
    { icon: <User size={18} />,          label: 'View their profile',    onClick: () => navigate(`/profile/${initiatorId}`) },
    { icon: <Compass size={18} />,       label: 'Back to discover',      onClick: () => navigate('/') },
  ]

  return (
    <div className={styles.acceptedPage}>
      {/* Orb animation */}
      <div className={styles.orbStage} aria-hidden="true">
        <div className={`${styles.orbA} ${phase >= 1 ? styles.moving : ''}`} />
        <div className={`${styles.orbB} ${phase >= 1 ? styles.moving : ''}`} />
        {phase >= 2 && <div className={styles.pulse} />}
      </div>

      {/* Text */}
      <p className={`${styles.acceptedText} ${phase >= 3 ? styles.visible : ''}`}>
        You are now connected.
      </p>
      <p className={`${styles.acceptedSub} ${phase >= 3 ? styles.visible : ''}`}>
        A record of your mutual consent has been created.
      </p>

      {/* Action cards */}
      <div className={styles.actionCards}>
        {actionCards.map((card, i) => (
          <button
            key={card.label}
            className={`${styles.actionCard} ${phase >= 4 ? styles.visible : ''}`}
            style={{ transitionDelay: phase >= 4 ? `${i * 80}ms` : '0ms' }}
            onClick={card.onClick}
          >
            <span className={styles.actionCardIcon}>{card.icon}</span>
            {card.label}
          </button>
        ))}
      </div>
    </div>
  )
}
