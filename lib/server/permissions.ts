export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'product_manager'
  | 'order_manager'
  | 'support'
  | 'developer'

const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  super_admin: ['*'],
  owner: [
    'analytics:read',
    'exports:read',
    'orders:list',
    'orders:read',
    'orders:update-status',
    'products:list',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'catalog:bulk-update',
    'catalog:categories',
    'inventory:read',
    'media:manage',
    'settings:read',
    'settings:update',
    'admin-users:manage',
    'upload:image',
  ],
  product_manager: [
    'products:list',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'catalog:bulk-update',
    'catalog:categories',
    'inventory:read',
    'media:manage',
    'upload:image',
  ],
  order_manager: [
    'exports:read',
    'orders:list',
    'orders:read',
    'orders:update-status',
  ],
  support: [
    'orders:list',
    'orders:read',
  ],
  developer: [
    'analytics:read',
    'exports:read',
    'orders:list',
    'orders:read',
    'products:list',
    'products:read',
    'inventory:read',
    'settings:read',
  ],
}

/**
 * Check whether a role is allowed to perform an action.
 * Single-password sessions still map to super_admin until real admin users exist.
 */
export function hasPermission(role: UserRole, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? []
  return permissions.includes('*') || permissions.includes(action)
}

export function getRolePermissions(role: UserRole): readonly string[] {
  return ROLE_PERMISSIONS[role] ?? []
}
