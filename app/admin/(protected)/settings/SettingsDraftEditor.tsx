'use client'

import { useMemo, useState } from 'react'

export default function SettingsDraftEditor({
  initialDraft,
}: {
  initialDraft: Record<string, unknown>
}) {
  const initialText = useMemo(() => JSON.stringify(initialDraft, null, 2), [initialDraft])
  const [draftText, setDraftText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save(publish: boolean) {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const draft = JSON.parse(draftText) as Record<string, unknown>
      const response = await fetch('/api/admin/store-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, publish }),
      })
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error ?? 'Failed to save settings')
      }

      setMessage(publish ? 'Settings snapshot saved. To apply it to the live store, update the deployment environment and redeploy.' : 'Draft settings saved.')
    } catch (currentError) {
      if (currentError instanceof SyntaxError) {
        setError('Settings JSON is invalid.')
      } else {
        setError(currentError instanceof Error ? currentError.message : 'Failed to save settings')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">Draft</p><p>Snapshots are saved for deployment planning. Live storefront settings are supplied by the deployment environment in this release.</p>
      <h2 className="admin-sectionTitle">Deployment settings snapshots</h2>
      <div className="admin-inputShell" style={{ marginTop: '14px' }}>
        <label className="admin-inputShell__label" htmlFor="store-settings-draft">
          Store settings JSON
        </label>
        <textarea
          id="store-settings-draft"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          spellCheck={false}
          style={{ minHeight: '360px', fontFamily: 'monospace' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={saving}
          onClick={() => void save(false)}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={saving}
          onClick={() => void save(true)}
        >
          {saving ? 'Publishing...' : 'Publish Snapshot'}
        </button>
      </div>

      {message ? <p className="admin-inlineMessage admin-inlineMessage--success" style={{ marginTop: '12px' }}>{message}</p> : null}
      {error ? <p className="admin-inlineMessage admin-inlineMessage--error" style={{ marginTop: '12px' }}>{error}</p> : null}
    </section>
  )
}
