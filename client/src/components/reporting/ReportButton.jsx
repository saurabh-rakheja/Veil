import { useState } from 'react'
import { AlertOctagon } from 'lucide-react'
import ReportModal from './ReportModal'

export default function ReportButton({ reportedUserId, contentType = 'profile', contentId = null, style }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '12px 8px',
          minHeight: 44,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'Satoshi, sans-serif',
          fontSize: 12,
          color: '#B8AEE0',
          ...style,
        }}
        aria-label="Report this content"
      >
        <AlertOctagon size={14} color="#BE185D" />
        <span style={{ textDecorationLine: 'none' }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          Report
        </span>
      </button>

      <ReportModal
        open={open}
        onOpenChange={setOpen}
        reportedUserId={reportedUserId}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  )
}
