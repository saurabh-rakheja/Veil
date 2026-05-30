import { useState } from 'react'
import { Heart, Users, Compass, Link2, Star, HelpCircle, CheckCircle2 } from 'lucide-react'
import styles from './Steps.module.css'

const OPTIONS = [
  { value: 'genuine_connection',    icon: Heart,       title: 'Genuine connection',    desc: 'Looking for deep, meaningful connection' },
  { value: 'community_friendship',  icon: Users,       title: 'Community & friendship', desc: 'Meeting like-minded people' },
  { value: 'exploration_curiosity', icon: Compass,     title: 'Exploration & curiosity', desc: 'Curious and want to learn' },
  { value: 'relationship',          icon: Link2,       title: 'A relationship',         desc: 'Seeking an ongoing partnership' },
  { value: 'finding_my_people',     icon: Star,        title: 'Finding my people',      desc: 'Building my community' },
  { value: 'not_sure',              icon: HelpCircle,  title: 'Not sure yet',           desc: 'Still figuring out what I want' },
]

export default function Step1_LookingFor({ data, onContinue }) {
  const [selected, setSelected] = useState(data.lookingFor ?? [])

  function toggle(value) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <div>
      <h1 className={styles.heading}>What brings you here?</h1>
      <p className={styles.sub}>Select everything that applies. You can change this later.</p>

      <div className={styles.cardGrid}>
        {OPTIONS.map(({ value, icon: Icon, title, desc }) => {
          const isSelected = selected.includes(value)
          return (
            <button
              key={value}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              onClick={() => toggle(value)}
            >
              {isSelected && <CheckCircle2 size={16} className={styles.cardCheck} />}
              <div className={styles.cardIcon}><Icon size={20} /></div>
              <div className={styles.cardTitle}>{title}</div>
              <div className={styles.cardDesc}>{desc}</div>
            </button>
          )
        })}
      </div>

      <button
        className={styles.continueBtn}
        disabled={selected.length === 0}
        onClick={() => onContinue({ lookingFor: selected })}
      >
        Continue
      </button>
      <p className={styles.stepIndicator}>1 of 6</p>
    </div>
  )
}
