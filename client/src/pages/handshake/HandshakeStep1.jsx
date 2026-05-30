import { useState } from 'react'
import { Circle, CheckCircle2 } from 'lucide-react'
import styles from './HandshakeFlow.module.css'

function LoadingDots() {
  return (
    <span className={styles.dots} aria-label="Loading">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  )
}

export default function HandshakeStep1({ recipientName, sharedCount, onSend, loading, error }) {
  const [message,  setMessage]  = useState('')
  const hasStartedTyping        = message.length > 0

  const charAtLimit  = message.length >= 300
  const charNearLimit = message.length >= 250 && message.length < 300
  const canSubmit    = message.length >= 50 && message.length <= 300 && !loading

  return (
    <>
      <h1 className={styles.heading}>Introduce yourself to {recipientName}.</h1>
      <p className={styles.sub}>This is the first thing they will read from you. Be genuine.</p>

      {sharedCount > 0 && (
        <div className={styles.contextChip}>
          <span className={styles.contextDot} />
          You share {sharedCount} common interest{sharedCount !== 1 ? 's' : ''}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className={styles.textareaWrap}>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What drew you to their profile? Why are you reaching out?"
            maxLength={300}
            disabled={loading}
            aria-label="Introduction message"
          />
          <span className={`${styles.charCount} ${charNearLimit ? styles.charCountWarn : ''} ${charAtLimit ? styles.charCountDanger : ''}`}>
            {message.length} / 300
          </span>
        </div>

        {message.length > 0 && message.length < 50 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B5FA6', fontFamily: 'Satoshi, sans-serif' }}>
            <Circle size={14} color="#6B5FA6" />
            <span>{message.length} / 50 — write a little more</span>
          </div>
        )}

        {message.length >= 50 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, animation: '_hs_fadeIn 200ms ease-out', fontSize: 12, color: '#22C55E', fontFamily: 'Satoshi, sans-serif' }}>
            <CheckCircle2 size={14} color="#22C55E" />
            <span>Good to go</span>
          </div>
        )}
      </div>

      <p className={`${styles.helperText} ${hasStartedTyping ? styles.helperTextHidden : ''}`}>
        Be specific. Generic messages are less likely to be accepted.
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <button
        className={styles.submitBtn}
        disabled={!canSubmit}
        onClick={() => onSend(message)}
      >
        {loading ? <LoadingDots /> : 'Send handshake request'}
      </button>

      <button className={styles.cancelBtn} onClick={() => history.back()}>
        Cancel
      </button>
    </>
  )
}
