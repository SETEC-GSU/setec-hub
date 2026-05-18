import { getUser } from "./getUser"
import { canAccess } from "./canAccess"
import { redirect } from "next/navigation"
import type { Permission } from "./permissions"

type CanAccessRole = Parameters<typeof canAccess>[0]

export async function requirePermission(permission: Permission) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = String(user.role || "") as CanAccessRole

  if (!canAccess(role, permission)) {
    redirect("/")
  }

  return user
}