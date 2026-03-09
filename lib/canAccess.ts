import { rolePermissions } from "./permissions"
import type { Role } from "./roles"
import type { Permission } from "./permissions"

export function canAccess(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}