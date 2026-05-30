import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TAG_TAXONOMY } from '@shared/constants/tagTaxonomy'
import styles from './Steps.module.css'

export default function Step4_Limits({ data, onContinue }) {
  const [selected, setSelected] = useState(data.limits ?? [])
  const [open, setOpen] = useState(new Set([TAG_TAXONOMY[0].category]))
  const interests = data.interests ?? []

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
      <h1 className={styles.heading}>Things that are not for you</h1>
      <p className={styles.sub}>Just as important as your interests. Only trusted connections see this.</p>

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
                  {tags.map(tag => {
                    const isSelected = selected.includes(tag)
                    const isConflict = isSelected && interests.includes(tag)
                    return (
                      <div key={tag} className={styles.tagItem}>
                        <button
                          className={`${styles.chip} ${isSelected ? styles.chipLimit : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                        {isConflict && (
                          <p className={styles.conflictNotice}>
                            This overlaps with your stated interest — it will be shown as a conflict to others.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className={styles.continueBtn}
        disabled={selected.length === 0}
        onClick={() => onContinue({ limits: selected })}
      >
        Continue
      </button>
      <p className={styles.stepIndicator}>4 of 6</p>
      <button className={styles.skipBtn} onClick={() => onContinue({ limits: [] })}>
        Skip for now — you can add limits later
      </button>
    </div>
  )
}
