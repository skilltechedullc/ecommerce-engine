'use client'

import { useState } from 'react'

type TemplateDraft = {
  template_key: string
  channel: string
  subject: string
  body: string
  variables: string[]
  is_active: boolean
}

export default function NotificationTemplateEditor({ starterTemplates }: { starterTemplates: TemplateDraft[] }) {
  const [drafts, setDrafts] = useState(starterTemplates)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState('')

  function updateDraft(index: number, patch: Partial<TemplateDraft>) {
    setDrafts((current) => current.map((draft, currentIndex) => currentIndex === index ? { ...draft, ...patch } : draft))
  }

  async function saveDraft(draft: TemplateDraft) {
    setSavingKey(draft.template_key)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/notification-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save template')
      setMessage(`Saved ${draft.template_key}.`)
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Unable to save template')
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="admin-stack">
      {drafts.map((draft, index) => (
        <section key={draft.template_key} className="admin-surface">
          <p className="admin-sectionEyebrow">{draft.channel}</p>
          <h2 className="admin-sectionTitle">{draft.template_key}</h2>
          <div className="admin-formGrid" style={{ marginTop: '16px' }}>
            <label className="admin-inputShell">
              <span className="admin-inputShell__label">Subject</span>
              <input value={draft.subject} onChange={(event) => updateDraft(index, { subject: event.target.value })} />
            </label>
            <label className="admin-inputShell">
              <span className="admin-inputShell__label">Channel</span>
              <select value={draft.channel} onChange={(event) => updateDraft(index, { channel: event.target.value })}>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="internal">Internal</option>
              </select>
            </label>
          </div>
          <label className="admin-inputShell" style={{ marginTop: '14px' }}>
            <span className="admin-inputShell__label">Body</span>
            <textarea value={draft.body} onChange={(event) => updateDraft(index, { body: event.target.value })} />
          </label>
          <button
            type="button"
            onClick={() => saveDraft(draft)}
            disabled={savingKey === draft.template_key}
            className="admin-button admin-button--primary"
            style={{ marginTop: '14px' }}
          >
            {savingKey === draft.template_key ? 'Saving...' : 'Save Template'}
          </button>
        </section>
      ))}
      {message ? <p className="admin-inlineMessage admin-inlineMessage--success">{message}</p> : null}
      {error ? <p className="admin-inlineMessage admin-inlineMessage--error">{error}</p> : null}
    </div>
  )
}
