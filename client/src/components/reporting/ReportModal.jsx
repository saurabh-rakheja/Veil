import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuth } from '@clerk/clerk-react'
import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import styles from './ReportModal.module.css'

const CATEGORIES = [
  { value: 'fake_or_bot',       label: 'Fake or bot account',              priority: false },
  { value: 'harassment',        label: 'Harassment or abusive behaviour',   priority: false },
  { value: 'consent_violation', label: 'Consent violation',                 priority: false },
  { value: 'illegal_content',   label: 'Illegal or dangerous content',      priority: true  },
  { value: 'underage_concern',  label: 'Underage concern',                  priority: true  },
  { value: 'spam',              label: 'Platform misuse or spam',            priority: false },
  { value: 'other',             label: 'Other',                             priority: false },
]

const CONTENT_TYPE_LABELS = {
  profile: 'profile',
  message: 'message',
  content: 'content',
}

function LoadingDots() {
  return (
    <span className={styles.dots} aria-label="Loading">
      <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
    </span>
  )
}

export default function ReportModal({ open, onOpenChange, reportedUserId, contentType = 'profile', contentId = null }) {
  const { getToken }    = useAuth()
  const [step,          setStep]          = useState(1)   // 1 | 2 | 'done'
  const [category,      setCategory]      = useState('')
  const [detail,        setDetail]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [blocking,      setBlocking]      = useState(false)
  const [error,         setError]         = useState('')
  const [isCritical,    setIsCritical]    = useState(false)

  function reset() {
    setStep(1); setCategory(''); setDetail('')
    setLoading(false); setBlocking(false); setError(''); setIsCritical(false)
  }

  function handleOpenChange(val) {
    if (!val) reset()
    onOpenChange(val)
  }

  function selectCategory(val) {
    setCategory(val)
    const cat = CATEGORIES.find(c => c.value === val)
    setIsCritical(cat?.priority ?? false)
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const token = await getToken()
      const res   = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reportedUserId, contentType, contentId, category, detail }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setStep('done')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBlock() {
    setBlocking(true)
    try {
      const token = await getToken()
      await fetch('/api/reports/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blockedUserId: reportedUserId }),
      })
    } finally {
      setBlocking(false)
      handleOpenChange(false)
    }
  }

  const typeLabel = CONTENT_TYPE_LABELS[contentType] ?? 'content'
  const sla       = isCritical ? '4 hours' : '24 hours'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}>
          <Dialog.Content className={styles.dialog} aria-describedby={undefined}>

            {/* ── Step 1: Category selection ── */}
            {step === 1 && (
              <>
                <div className={styles.header}>
                  <Dialog.Title className={styles.title}>
                    Report this {typeLabel}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className={styles.closeBtn} aria-label="Close">
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className={styles.categoryList} role="radiogroup" aria-label="Report category">
                  {CATEGORIES.map(cat => {
                    const selected = category === cat.value
                    return (
                      <div key={cat.value}>
                        <div
                          role="radio"
                          aria-checked={selected}
                          tabIndex={0}
                          className={`${styles.categoryOption} ${selected ? styles.categoryOptionSelected : ''}`}
                          onClick={() => selectCategory(cat.value)}
                          onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? selectCategory(cat.value) : null}
                        >
                          <span className={`${styles.radio} ${selected ? styles.radioSelected : ''}`}>
                            {selected && <span className={styles.radioDot} />}
                          </span>
                          {cat.label}
                        </div>
                        {selected && cat.priority && (
                          <div className={styles.priorityNote}>
                            <AlertTriangle size={12} />
                            This category is reviewed as a priority within 4 hours.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  className={styles.primaryBtn}
                  disabled={!category}
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </>
            )}

            {/* ── Step 2: Detail + submit ── */}
            {step === 2 && (
              <>
                <div className={styles.header}>
                  <Dialog.Title className={styles.title}>
                    Report this {typeLabel}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className={styles.closeBtn} aria-label="Close">
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>

                <p className={styles.detailLabel}>
                  Would you like to add any detail? <span style={{ color: '#6B5FA6' }}>(Optional)</span>
                </p>

                <div>
                  <textarea
                    className={styles.textarea}
                    value={detail}
                    onChange={e => setDetail(e.target.value.slice(0, 200))}
                    placeholder="Any additional context that might help our review team."
                    maxLength={200}
                  />
                  <p className={styles.charCount}>{detail.length} / 200</p>
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}

                <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
                  {loading ? <LoadingDots /> : 'Submit report'}
                </button>

                <button className={styles.backLink} onClick={() => setStep(1)}>
                  ← Back
                </button>
              </>
            )}

            {/* ── Confirmation view ── */}
            {step === 'done' && (
              <>
                <div className={styles.header}>
                  <Dialog.Title className={styles.title}>Report received</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className={styles.closeBtn} aria-label="Close"><X size={16} /></button>
                  </Dialog.Close>
                </div>

                <div className={styles.confirmation}>
                  <CheckCircle2 size={32} className={styles.confirmIcon} />
                  <p className={styles.confirmTitle}>Report received.</p>
                  <p className={styles.confirmText}>
                    We review every report and take action where our guidelines are violated.
                    You'll receive an update within {sla}.
                  </p>
                </div>

                <button className={styles.blockBtn} onClick={handleBlock} disabled={blocking}>
                  {blocking ? 'Blocking…' : 'Also block this user'}
                </button>

                <Dialog.Close asChild>
                  <button className={styles.ghostBtn}>Done</button>
                </Dialog.Close>
              </>
            )}

          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
