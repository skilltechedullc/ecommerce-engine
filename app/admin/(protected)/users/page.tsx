import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  await requireAdminPermission('admin-users:manage')
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
