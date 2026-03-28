export type UserRole = 'super_admin' | 'product_manager' | 'delivery_manager'

/**
 * Check whether a role is allowed to perform an action.
 * Currently only super_admin exists. Future roles can be added here.
 */
export function hasPermission(role: UserRole, action: string): boolean {
  void action
  if (role === 'super_admin') return true
  // Placeholder for future role-based rules
  return false
}
