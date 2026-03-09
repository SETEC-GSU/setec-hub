import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { routePermissions } from "@/lib/routePermissions"
import { canAccess } from "@/lib/canAccess"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const pathname = req.nextUrl.pathname

  // ⭐ IGNORAR ROTAS INTERNAS NEXT (resolve erro regex Turbopack)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/login")
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 })
        },
      },
    }
  )

  // ⭐ USER
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // ⭐ ROLE
  const { data: profile } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // ⭐ PERMISSÃO COM SUPORTE A SUBROTAS
  const sortedRoutes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  )

  const route = sortedRoutes.find((r) => pathname.startsWith(r))
  const permission = route ? routePermissions[route] : null

  if (permission && !canAccess(profile.role, permission)) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return res
}

// ⭐ MATCHER SIMPLES (resolve bug regex Next 16)
export const config = {
  matcher: ["/:path*"],
}