import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useClerk } from '@clerk/clerk-react'

const API = import.meta.env.VITE_API_URL

const DEFAULT_VISIBILITY = {
  displayName: 'public', city: 'connected', experienceLevel: 'connected',
  lookingFor: 'connected', interests: 'connected', limits: 'trusted',
}
const VIS_OPTIONS = ['public', 'connected', 'trusted']
const VIS_LABELS = {
  displayName: 'Display name', city: 'City', experienceLevel: 'Experience level',
  lookingFor: 'Looking for', interests: 'Interests', limits: 'Limits',
}

function Toggle({ on, onClick }) {
  return (
    <button className={'switch' + (on ? ' on' : '')} onClick={onClick}
      role="switch" aria-checked={on} style={{ flexShrink: 0 }}><span/></button>
  )
}

function Row({ title, desc, control, icon }) {
  return (
    <div className="set-row">
      {icon && <div className="set-row-ico">{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="set-row-title">{title}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function SetCard({ title, sub, icon, children }) {
  return (
    <div className="card set-card">
      <div className="set-card-head">
        <div className="set-card-ico">{icon}</div>
        <div>
          <h3 style={{ fontSize: 16.5 }}>{title}</h3>
          {sub && <p className="muted" style={{ fontSize: 13, marginTop: 3 }}>{sub}</p>}
        </div>
      </div>
      <div className="set-card-body">{children}</div>
    </div>
  )
}

function DeleteModal({ onClose, onConfirm, deleting, deleteError }) {
  const [step, setStep]     = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [typed, setTyped]   = useState('')
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: 18 }}>{step === 1 ? 'Delete your account?' : 'Type DELETE to confirm'}</h3>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 1 ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                This permanently removes your profile, consent settings, connections, and all handshake history. Your audit log is retained for 2 years as required by law. This cannot be undone.
              </p>
              <label className="opt-row">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}/>
                <span>I understand this action is permanent and irreversible.</span>
              </label>
            </>
          ) : (
            <>
              {deleteError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{deleteError}</p>}
              <div className="input-wrap">
                <input type="text" value={typed} onChange={e => setTyped(e.target.value)}
                  placeholder="DELETE" autoFocus style={{ flex: 1 }}/>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-quiet" onClick={onClose} style={{ flex: 1 }} disabled={deleting}>Cancel</button>
          {step === 1
            ? <button className="btn btn-danger" style={{ flex: 2 }} disabled={!agreed} onClick={() => setStep(2)}>Continue</button>
            : <button className="btn btn-danger" style={{ flex: 2 }} disabled={typed !== 'DELETE' || deleting} onClick={onConfirm}>
                {deleting ? 'Deleting…' : 'Permanently Delete Account'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate     = useNavigate()
  const { getToken } = useAuth()
  const { signOut }  = useClerk()

  const [profile, setProfile] = useState({
    displayName: '', city: '', pronouns: '', bio: '', isProfileVisible: true,
    notificationPreferences: { handshakeReceived: true, handshakeAccepted: true, newMessage: true },
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)
  const [profileError,  setProfileError]  = useState('')
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY)
  const [visSaving, setVisSaving]   = useState(false)
  const [visSaved,  setVisSaved]    = useState(false)
  const [visError,  setVisError]    = useState('')
  const [blocked, setBlocked]       = useState([])
  const [unblocking, setUnblocking] = useState(null)
  const [exporting, setExporting]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting,  setDeleting]    = useState(false)
  const [deleteError,setDeleteError]= useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const [profileRes, consentRes, blocksRes] = await Promise.all([
        fetch(`${API}/api/users/profile`,   { headers }),
        fetch(`${API}/api/consent-profile`, { headers }),
        fetch(`${API}/api/reports/block`,   { headers }),
      ])
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json()
        if (p && Object.keys(p).length) {
          setProfile(prev => ({
            ...prev,
            displayName: p.displayName ?? '',
            city: p.city ?? '',
            pronouns: p.pronouns ?? '',
            bio: p.bio ?? '',
            isProfileVisible: p.isProfileVisible ?? true,
            notificationPreferences: {
              handshakeReceived: p.notificationPreferences?.handshakeReceived ?? true,
              handshakeAccepted: p.notificationPreferences?.handshakeAccepted ?? true,
              newMessage:        p.notificationPreferences?.newMessage        ?? true,
            },
          }))
        }
      }
      if (consentRes.ok) {
        const { profile: cp } = await consentRes.json()
        if (cp?.visibilitySettings) setVisibility({ ...DEFAULT_VISIBILITY, ...cp.visibilitySettings })
      }
      if (blocksRes.ok) {
        const data = await blocksRes.json()
        setBlocked(Array.isArray(data) ? data : [])
      }
    } catch (err) { console.error('[Settings] fetch error:', err) }
  }, [getToken])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveProfile() {
    setProfileSaving(true); setProfileError(''); setProfileSaved(false)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: profile.displayName, city: profile.city, pronouns: profile.pronouns,
          bio: profile.bio, isProfileVisible: profile.isProfileVisible,
          notificationPreferences: profile.notificationPreferences,
        }),
      })
      if (!res.ok) { const d = await res.json(); setProfileError(d.error || 'Failed to save.') }
      else { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500) }
    } catch { setProfileError('Failed to save. Please try again.') }
    finally { setProfileSaving(false) }
  }

  async function saveVisibility() {
    setVisSaving(true); setVisError(''); setVisSaved(false)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/consent-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visibilitySettings: visibility }),
      })
      if (!res.ok) { const d = await res.json(); setVisError(d.error || 'Failed to save.') }
      else { setVisSaved(true); setTimeout(() => setVisSaved(false), 2500) }
    } catch { setVisError('Failed to save. Please try again.') }
    finally { setVisSaving(false) }
  }

  async function unblock(blockedUserId) {
    setUnblocking(blockedUserId)
    try {
      const token = await getToken()
      await fetch(`${API}/api/reports/block/${blockedUserId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setBlocked(prev => prev.filter(b => b.blockedUserId !== blockedUserId))
    } catch (err) { console.error('[Settings] unblock error:', err) }
    finally { setUnblocking(null) }
  }

  async function exportData() {
    setExporting(true)
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/users/data-export`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `loom-data-export-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error('[Settings] export error:', err) }
    finally { setExporting(false) }
  }

  async function deleteAccount() {
    setDeleting(true); setDeleteError(null)
    try {
      const token = await getToken()
      const res   = await fetch(`${API}/api/users/delete-account`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deletion failed')
      await signOut(); localStorage.clear(); sessionStorage.clear()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('[Settings] delete error:', err)
      setDeleteError(err.message); setDeleting(false)
    }
  }

  function setPref(key, value) {
    setProfile(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, [key]: value } }))
  }

  const bioLen = profile.bio.length

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <SetCard title="My Profile" sub="How you appear to other members." icon="👤">
        <div className="set-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="set-row-title">Display name</div>
            <div className="input-wrap" style={{ marginTop: 8 }}>
              <input style={{ flex: 1 }} value={profile.displayName} maxLength={40}
                onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                placeholder="How others see you"/>
            </div>
          </div>
        </div>
        <div className="set-row">
          <div style={{ flex: 1 }}>
            <div className="set-row-title">City</div>
            <div className="input-wrap" style={{ marginTop: 8 }}>
              <input style={{ flex: 1 }} value={profile.city} maxLength={60}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                placeholder="e.g. Berlin"/>
            </div>
          </div>
        </div>
        <div className="set-row">
          <div style={{ flex: 1 }}>
            <div className="set-row-title">Pronouns</div>
            <div className="input-wrap" style={{ marginTop: 8 }}>
              <input style={{ flex: 1 }} value={profile.pronouns} maxLength={30}
                onChange={e => setProfile(p => ({ ...p, pronouns: e.target.value }))}
                placeholder="e.g. they/them"/>
            </div>
          </div>
        </div>
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="set-row-title">Bio</div>
          <textarea className="ta" rows={3} maxLength={200} value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="A few words about you"/>
          <div style={{ textAlign: 'right', fontSize: 11.5, color: bioLen >= 180 ? 'var(--danger)' : 'var(--text-lo)' }}>
            {bioLen}/200
          </div>
        </div>
        <Row title="Profile visible" desc="Show you in discovery"
          control={<Toggle on={profile.isProfileVisible}
            onClick={() => setProfile(p => ({ ...p, isProfileVisible: !p.isProfileVisible }))}/>}/>
        {profileError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{profileError}</p>}
        <button className={'btn ' + (profileSaved ? 'btn-ghost' : 'btn-primary')} style={{ marginTop: 8 }}
          onClick={saveProfile} disabled={profileSaving}>
          {profileSaving ? 'Saving…' : profileSaved ? '✓ Saved' : 'Save profile'}
        </button>
      </SetCard>

      <SetCard title="Tiered Visibility" sub="Nothing is public by default. You control every layer." icon="👁">
        <div className="tier-legend">
          <span className="tier tier-public"><span className="dot"/>Public · anyone on Loom</span>
          <span className="tier tier-connected"><span className="dot"/>Connected · after a handshake</span>
          <span className="tier tier-trusted"><span className="dot"/>Trusted · mutual deep opt-in</span>
        </div>
        {Object.entries(VIS_LABELS).map(([key, label]) => (
          <div key={key} className="vis-field">
            <span className="vis-label">{label}</span>
            <div className="seg">
              {VIS_OPTIONS.map(opt => (
                <button key={opt} className={'seg-btn' + (visibility[key] === opt ? ' on' : '')}
                  onClick={() => setVisibility(v => ({ ...v, [key]: opt }))}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {visError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{visError}</p>}
        <button className={'btn ' + (visSaved ? 'btn-ghost' : 'btn-primary')} style={{ marginTop: 8 }}
          onClick={saveVisibility} disabled={visSaving}>
          {visSaving ? 'Saving…' : visSaved ? '✓ Saved' : 'Save visibility'}
        </button>
      </SetCard>

      <SetCard title="Notifications" sub="Choose what you hear about." icon="🔔">
        <Row title="New handshake request"
          control={<Toggle on={profile.notificationPreferences.handshakeReceived}
            onClick={() => setPref('handshakeReceived', !profile.notificationPreferences.handshakeReceived)}/>}/>
        <Row title="Handshake accepted"
          control={<Toggle on={profile.notificationPreferences.handshakeAccepted}
            onClick={() => setPref('handshakeAccepted', !profile.notificationPreferences.handshakeAccepted)}/>}/>
        <Row title="New message"
          control={<Toggle on={profile.notificationPreferences.newMessage}
            onClick={() => setPref('newMessage', !profile.notificationPreferences.newMessage)}/>}/>
        <Row title="Account warnings" desc="Cannot be disabled"
          control={<Toggle on={true} onClick={() => {}}/>}/>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveProfile} disabled={profileSaving}>
          {profileSaving ? 'Saving…' : 'Save notifications'}
        </button>
      </SetCard>

      <SetCard title="Privacy & Security" sub="Your data, your control." icon="🔒">
        <Row title="Sessions" desc="Managed by Clerk" control={null}/>
        <Row title="Export your data" desc="Download a copy of everything we hold."
          control={<button className="btn btn-ghost btn-sm" onClick={exportData} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>}/>
      </SetCard>

      <SetCard title="Blocked Members" sub="Blocked people can't see you, reach you, or know they were blocked." icon="🚫">
        {blocked.length === 0 ? (
          <div style={{ padding: '14px 0', color: 'var(--text-lo)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 9 }}>
            ✓ You haven't blocked anyone.
          </div>
        ) : blocked.map(b => (
          <Row key={b.blockedUserId}
            title={b.blockedUserDisplayName || b.blockedUserId?.slice(0, 12) + '…'}
            desc="Blocked"
            control={<button className="btn btn-ghost btn-sm"
              onClick={() => unblock(b.blockedUserId)}
              disabled={unblocking === b.blockedUserId}>
              {unblocking === b.blockedUserId ? 'Unblocking…' : 'Unblock'}
            </button>}/>
        ))}
      </SetCard>

      <SetCard title="Legal" sub="" icon="📄">
        {['Terms of Service', 'Privacy Policy', 'Submit a GDPR Request'].map(item => (
          <Row key={item} title={item} control={<span style={{ color: 'var(--text-lo)', fontSize: 18 }}>›</span>}/>
        ))}
      </SetCard>

      <SetCard title="Account" sub="" icon="⚙">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost"
            onClick={() => signOut().then(() => navigate('/login', { replace: true }))}>
            Sign out
          </button>
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
            Delete account
          </button>
        </div>
      </SetCard>

      {showDelete && (
        <DeleteModal onClose={() => !deleting && setShowDelete(false)}
          onConfirm={deleteAccount} deleting={deleting} deleteError={deleteError}/>
      )}
    </div>
  )
}
