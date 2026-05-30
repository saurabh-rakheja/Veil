import { useState } from 'react'

const EXP_OPTIONS = [
  { value: 'curious_exploring', label: 'Newly curious' },
  { value: 'some_experience',   label: 'Exploring' },
  { value: 'experienced',       label: 'Experienced' },
  { value: 'deeply_embedded',   label: 'Deep community roots' },
]
const LF_OPTIONS = [
  { value: 'genuine_connection',    label: 'Genuine connection' },
  { value: 'community_friendship',  label: 'Community & friendship' },
  { value: 'exploration_curiosity', label: 'Exploration & curiosity' },
  { value: 'relationship',          label: 'A relationship' },
  { value: 'finding_my_people',     label: 'Finding my people' },
  { value: 'not_sure',              label: 'Not sure yet' },
]
const DEFAULTS = {
  city: '',
  experienceLevel: EXP_OPTIONS.map(o => o.value),
  lookingFor: LF_OPTIONS.map(o => o.value),
  minCompatibility: 0,
}

export default function FilterPanel({ filters, onApply, onClose }) {
  const [local, setLocal] = useState({ ...DEFAULTS, ...filters })

  function toggleArray(key, value) {
    setLocal(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }))
  }

  function handleApply() { onApply(local); onClose() }
  function handleReset()  { setLocal({ ...DEFAULTS }) }

  const sliderPct = local.minCompatibility
  const sliderBg  = `linear-gradient(to right, var(--teal) ${sliderPct}%, var(--surface-3) ${sliderPct}%)`

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()} role="dialog" aria-label="Filter discovery">
        {/* Header */}
        <div className="modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18 }}>Filters</h3>
          <button className="btn-icon" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* City */}
          <div>
            <div className="dlabel">City</div>
            <div className="input-wrap" style={{ background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-lo)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-hi)', fontSize: 14 }}
                type="text" placeholder="Filter by city…" value={local.city}
                onChange={e => setLocal(p => ({ ...p, city: e.target.value }))}/>
            </div>
          </div>

          {/* Experience */}
          <div>
            <div className="dlabel">Experience level</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXP_OPTIONS.map(({ value, label }) => {
                const on = local.experienceLevel.includes(value)
                return (
                  <button key={value}
                    className={`kink-chip${on ? ' on' : ''}`}
                    onClick={() => toggleArray('experienceLevel', value)}>
                    {on ? '✓' : '+'} {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Looking for */}
          <div>
            <div className="dlabel">Looking for</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LF_OPTIONS.map(({ value, label }) => {
                const on = local.lookingFor.includes(value)
                return (
                  <button key={value}
                    className={`kink-chip${on ? ' on' : ''}`}
                    onClick={() => toggleArray('lookingFor', value)}>
                    {on ? '✓' : '+'} {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Min compat */}
          <div>
            <div className="dlabel" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Minimum compatibility</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-hi)' }}>{local.minCompatibility}%</span>
            </div>
            <input type="range" min={0} max={100} step={5}
              value={local.minCompatibility}
              onChange={e => setLocal(p => ({ ...p, minCompatibility: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--teal)', background: sliderBg, height: 6, borderRadius: 99, outline: 'none', cursor: 'pointer', marginTop: 8 }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-lo)', marginTop: 4 }}>
              <span>Any</span><span>100%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button className="btn btn-quiet" style={{ flex: 1 }} onClick={handleReset}>Reset all</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApply}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}
