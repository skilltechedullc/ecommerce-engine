'use client'

import { useState } from 'react'

type HealthCheck = {
  provider: string
  status: 'ready' | 'disabled' | 'missing'
  message: string
}

export default function ProviderHealthPanel() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runChecks() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/health/providers')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to run provider checks')
      setChecks(data.checks ?? data.data?.checks ?? [])
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Unable to run provider checks')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">Provider Health</p>
      <h2 className="admin-sectionTitle">Launch readiness checks</h2>
      <p className="admin-sectionText">
        Check whether required local environment values are present before connecting real client accounts.
      </p>
      <button type="button" onClick={runChecks} disabled={loading} className="admin-button admin-button--primary" style={{ marginTop: '14px' }}>
        {loading ? 'Checking...' : 'Run Provider Checks'}
      </button>
      {error ? <p className="admin-inlineMessage admin-inlineMessage--error" style={{ marginTop: '12px' }}>{error}</p> : null}
      {checks.length > 0 ? (
        <div className="admin-listStack" style={{ marginTop: '16px' }}>
          {checks.map((check) => (
            <div key={check.provider} className="admin-listRow" style={{ alignItems: 'flex-start' }}>
              <span className={`admin-badge ${badgeClass(check.status)}`}>{check.status}</span>
              <div>
                <p className="admin-summaryRow__value">{check.provider}</p>
                <p className="admin-sectionText" style={{ margin: '4px 0 0' }}>{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function badgeClass(status: HealthCheck['status']) {
  if (status === 'ready') return 'admin-badge--success'
  if (status === 'missing') return 'admin-badge--danger'
  return 'admin-badge--neutral'
}
