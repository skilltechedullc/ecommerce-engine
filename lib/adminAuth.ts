import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/permissions'
import { getAdminSessionPayload, isAdminSessionAuthenticated } from '@/lib/server/adminSession'
import type { UserRole } from '@/lib/server/permissions'

export async function isAdminAuthenticated(): Promise<boolean> {
  return isAdminSessionAuthenticated()
}

/** Returns the authenticated admin's role, or null if not authenticated. */
export async function getAdminRole(): Promise<UserRole | null> {
  const session = await getAdminSessionPayload()
  if (!session) return null
  return (session.role as UserRole | undefined) ?? 'super_admin'
}


export async function requireAdminPermission(permission: string): Promise<void> {
  const role = await getAdminRole()
  if (!role) redirect('/admin/login')
  if (!hasPermission(role, permission)) redirect('/admin/access-denied')
}