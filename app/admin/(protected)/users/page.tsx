import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  await requireAdminPermission('admin-users:manage')
  if (process.env.ADMIN_AUTH_MODE !== 'database') return <section className="admin-surface"><h2 className="admin-sectionTitle">Single administrator access</h2><p className="admin-sectionText">This store uses one administrator password. Separate staff accounts are not active. Contact your store manager to arrange individual access.</p><a className="admin-button admin-button--secondary" href="/admin/settings">Back to settings</a></section>
  const { users } = await fetchInternalApi<{
    users: Array<{
      id: string
      email: string
      name: string | null
      role: string
      status: string
      two_factor_enabled: boolean
    }>
  }>('/api/admin/users')
  const { sessions } = await fetchInternalApi<{
    sessions: Array<{
      id: string
      session_label: string | null
      ip_address: string | null
      user_agent: string | null
      revoked_at: string | null
      created_at: string
      expires_at: string
    }>
  }>('/api/admin/users/sessions')

  return <UsersClient users={users ?? []} sessions={sessions ?? []} />
}
