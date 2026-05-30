import { useState } from 'react'
import { Circle } from 'lucide-react'
import styles from './Steps.module.css'

const OPTIONS = [
  { value: 'curious_exploring', title: 'Curious and exploring',              desc: 'New to this, feeling things out' },
  { value: 'some_experience',   title: 'Some experience, still learning',    desc: "I've dipped my toes in" },
  { value: 'experienced',       title: 'Good understanding of my interests', desc: "I know what I like and what I don't" },
  { value: 'deeply_embedded',   title: 'Deeply embedded in this community',  desc: 'This has been part of my life for a while' },
]

export default function Step2_ExperienceLevel({ data, onContinue }) {
  const [selected, setSelected] = useState(data.experienceLevel ?? null)

  return (
    <div>
      <h1 className={styles.heading}>Your experience level</h1>
      <p className={styles.sub}>This helps with compatibility. You can update this any time.</p>

      <div className={styles.cardList}>
        {OPTIONS.map(({ value, title, desc }) => {
          const isSelected = selected === value
          return (
            <button
              key={value}
              className={`${styles.cardRow} ${isSelected ? styles.cardRowSelected : ''}`}
              onClick={() => setSelected(value)}
            >
              <div className={styles.cardRowText}>
                <div className={styles.cardRowTitle}>{title}</div>
                <div className={styles.cardRowDesc}>{desc}</div>
              </div>
              {isSelected && <Circle size={20} className={styles.radioIcon} fill="#7C3AED" />}
            </button>
          )
        })}
      </div>

      <button
        className={styles.continueBtn}
        disabled={selected === null}
        onClick={() => onContinue({ experienceLevel: selected })}
      >
        Continue
      </button>
      <p className={styles.stepIndicator}>2 of 6</p>
    </div>
  )
}
