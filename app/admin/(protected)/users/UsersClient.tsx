'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AdminUser = {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  two_factor_enabled: boolean
}

type AdminSession = {
  id: string
  session_label: string | null
  ip_address: string | null
  user_agent: string | null
  revoked_at: string | null
  created_at: string
  expires_at: string
}

export default function UsersClient({ users, sessions }: { users: AdminUser[]; sessions: AdminSession[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('owner')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function revokeSession(id: string) {
    setError('')
    const response = await fetch('/api/admin/users/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: id }),
    })
    if (!response.ok) { setError('Could not revoke session. Please try again.'); return }
    setMessage('Session revoked.')
    router.refresh()
  }


  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        role,
        status: temporaryPassword ? 'active' : 'invited',
        temporary_password: temporaryPassword || undefined,
        two_factor_enabled: false,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Could not save user')
      return
    }
    setEmail('')
    setName('')
    setRole('owner')
    setTemporaryPassword('')
    setMessage(temporaryPassword ? 'Admin account created.' : 'Invite recorded. Set a password before this account can sign in.')
    router.refresh()
  }

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-toolbarCard">
        <div>
          <p className="admin-sectionEyebrow">Admin access</p>
          <h2 className="admin-sectionTitle">Users, roles and sessions</h2>
          <p className="admin-sectionText">Create admin accounts and review their access. Email invitations and two-factor enrollment are not available in this release.</p>
        </div>
        <form onSubmit={invite} className="admin-filterGrid">
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="owner">Owner</option>
              <option value="product_manager">Product manager</option>
              <option value="order_manager">Order manager</option>
              <option value="support">Support</option>
              <option value="developer">Developer</option>
            </select>
          </label>
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Temporary password</span>
            <input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Optional, 12+ chars" />
          </label>
          <button className="admin-button admin-button--primary">Create Invite</button>
        </form>
        {message ? <p className="admin-inlineMessage admin-inlineMessage--success">{message}</p> : null}
        {error ? <p className="admin-inlineMessage admin-inlineMessage--error">{error}</p> : null}
      </section>
      <section className="admin-surface admin-tableCard">
        <div className="admin-tableWrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name ?? '-'}</td>
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td>{user.two_factor_enabled ? 'Blocked — enrollment unavailable' : 'Not configured'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-surface admin-tableCard">
        <div>
          <p className="admin-sectionEyebrow">Sessions</p>
          <h2 className="admin-sectionTitle">Recent admin sessions</h2>
        </div>
        <div className="admin-tableWrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Expires</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{new Date(session.created_at).toLocaleString()}</td>
                  <td>{new Date(session.expires_at).toLocaleString()}</td>
                  <td>{session.ip_address ?? '-'}</td>
                  <td>{session.revoked_at ? 'Revoked' : <button className="admin-button" onClick={() => revokeSession(session.id)}>Revoke session</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
