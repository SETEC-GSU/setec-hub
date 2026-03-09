import { redirect } from "next/navigation"
import { getUser } from "./getUser"
import type { Role } from "./roles"

export async function requireRole(allowedRoles: Role[]) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(user.role as Role)) {
    redirect("/")
  }

  return user
}

