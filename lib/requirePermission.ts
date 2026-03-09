import { getUser } from "./getUser"
import { canAccess } from "./canAccess"
import { redirect } from "next/navigation"
import type { Permission } from "./permissions"

export async function requirePermission(permission: Permission) {
  const user = await getUser()

  if (!user) redirect("/login")

  if (!canAccess(user.role, permission)) {
    redirect("/")
  }

  return user
}