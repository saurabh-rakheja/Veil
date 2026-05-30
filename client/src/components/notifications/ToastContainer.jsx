import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'

function toastEmoji(type) {
  if (type === 'new_message')        return '💬'
  if (type === 'handshake_accepted') return '✓'
  return '🤝'
}

function Toast({ toast }) {
  const navigate      = useNavigate()
  const { removeToast } = useNotifications()

  function handleClick() {
    if (toast.conversationId) navigate(`/chat/${toast.conversationId}`)
    else                      navigate('/connections/requests')
    removeToast(toast.id)
  }

  return (
    <div className="toast" onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{ cursor: 'pointer', position: 'relative', paddingRight: 36 }}>
      <span>{toastEmoji(toast.type)}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text-hi)', marginBottom: 2 }}>{toast.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{toast.body}</div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); removeToast(toast.id) }}
        aria-label="Dismiss"
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-lo)', padding: 2, lineHeight: 1 }}>
        ✕
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useNotifications()
  if (!toasts.length) return null
  return (
    <div className="toast-wrap">
      {toasts.map(t => <Toast key={t.id} toast={t}/>)}
    </div>
  )
}
