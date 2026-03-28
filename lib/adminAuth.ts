import { isAdminSessionAuthenticated } from '@/lib/server/adminSession'
import type { UserRole } from '@/lib/server/permissions'

export async function isAdminAuthenticated(): Promise<boolean> {
  return isAdminSessionAuthenticated()
}

/** Returns the authenticated admin's role, or null if not authenticated. */
export async function getAdminRole(): Promise<UserRole | null> {
  const ok = await isAdminSessionAuthenticated()
  if (!ok) return null
  // Single admin maps to super_admin. Future: look up role from session/DB.
  return 'super_admin'
}

