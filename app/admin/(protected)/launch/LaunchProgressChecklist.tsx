'use client'

import { useState } from 'react'

const storageKey = 'ecommerce-engine-launch-progress'

export default function LaunchProgressChecklist({ steps }: { steps: readonly string[] }) {
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = window.localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  function toggle(step: string) {
    setCompleted((current) => {
      const next = { ...current, [step]: !current[step] }
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const completeCount = steps.filter((step) => completed[step]).length

  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">Progress</p>
      <h2 className="admin-sectionTitle">Launch checklist</h2>
      <p className="admin-sectionText">
        {completeCount} of {steps.length} steps marked complete on this admin browser.
      </p>
      <div className="admin-listStack" style={{ marginTop: '14px' }}>
        {steps.map((step, index) => (
          <label
            key={step}
            className="admin-listRow"
            style={{ cursor: 'pointer', justifyContent: 'flex-start', alignItems: 'center' }}
          >
            <input
              type="checkbox"
              checked={Boolean(completed[step])}
              onChange={() => toggle(step)}
              style={{ width: '18px', height: '18px', flex: '0 0 auto' }}
            />
            <span className="admin-badge admin-badge--info">Step {index + 1}</span>
            <span className="admin-summaryRow__value" style={{ minWidth: 0 }}>{step}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
