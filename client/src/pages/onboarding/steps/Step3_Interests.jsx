import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TAG_TAXONOMY } from '@shared/constants/tagTaxonomy'
import styles from './Steps.module.css'

export default function Step3_Interests({ data, onContinue }) {
  const [selected, setSelected] = useState(data.interests ?? [])
  const [open, setOpen] = useState(new Set([TAG_TAXONOMY[0].category]))

  function toggleTag(tag) {
    setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function toggleCategory(cat) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div>
      <h1 className={styles.heading}>Your interests</h1>
      <p className={styles.sub}>Things you're curious about or enjoy. Only your connections see this.</p>

      <div className={styles.categories}>
        {TAG_TAXONOMY.map(({ category, tags }) => {
          const isOpen = open.has(category)
          return (
            <div key={category}>
              <button
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category)}
              >
                <span>{category}</span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
              </button>
              {isOpen && (
                <div className={styles.tagList}>
                  {tags.map(tag => (
                    <div key={tag} className={styles.tagItem}>
                      <button
                        className={`${styles.chip} ${selected.includes(tag) ? styles.chipInterest : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className={styles.continueBtn}
        disabled={selected.length === 0}
        onClick={() => onContinue({ interests: selected })}
      >
        Continue
      </button>
      <p className={styles.stepIndicator}>3 of 6</p>
      <p className={styles.visibilityFooter} style={{ marginTop: 8 }}>
        You can add more later from your profile.
      </p>
      <button className={styles.skipBtn} onClick={() => onContinue({ interests: [] })}>
        Skip for now — you can complete this later
      </button>
    </div>
  )
}
