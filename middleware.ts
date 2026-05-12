import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { routePermissions } from "@/lib/routePermissions"
import { canAccess } from "@/lib/canAccess"

type UserProfile = {
  role: string
}

type CanAccessRole = Parameters<typeof canAccess>[0]
type CanAccessPermission = Parameters<typeof canAccess>[1]

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/resetar-senha") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.includes(".")
  )
}

function redirectWithCookies(
  req: NextRequest,
  baseResponse: NextResponse,
  path: string,
  keepRedirectTo = false
) {
  const redirectUrl = new URL(path, req.url)

  if (keepRedirectTo) {
    const currentPath = req.nextUrl.pathname + req.nextUrl.search
    redirectUrl.searchParams.set("redirectTo", currentPath)
  }

  const redirectResponse = NextResponse.redirect(redirectUrl)

  const cookies = baseResponse.cookies.getAll()

  for (const cookie of cookies) {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  }

  return redirectResponse
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error || "")
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Variáveis de ambiente do Supabase não configuradas.")

    return redirectWithCookies(
      req,
      res,
      "/login?erro=env",
      true
    )
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        res.cookies.set(name, value, options)
      },
      remove(name: string, options: any) {
        res.cookies.set(name, "", {
          ...options,
          maxAge: 0,
        })
      },
    },
  })

  let user: User | null = null

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Erro ao validar usuário no middleware:", authError.message)
    }

    user = authUser
  } catch (error) {
    console.error(
      "Falha ao consultar auth no middleware:",
      getErrorMessage(error)
    )

    return redirectWithCookies(
      req,
      res,
      "/login?erro=auth-network",
      true
    )
  }

  if (!user) {
    return redirectWithCookies(
      req,
      res,
      "/login?erro=session",
      true
    )
  }

  let profile: UserProfile | null = null

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Erro ao buscar perfil do usuário:", error.message)
    }

    profile = data
  } catch (error) {
    console.error(
      "Falha ao consultar perfil no middleware:",
      getErrorMessage(error)
    )

    return redirectWithCookies(
      req,
      res,
      "/login?erro=profile-network",
      true
    )
  }

  if (!profile) {
    return redirectWithCookies(
      req,
      res,
      "/login?erro=profile",
      true
    )
  }

  const sortedRoutes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  )

  const route = sortedRoutes.find((r) => pathname.startsWith(r))
  const permission = route ? routePermissions[route] : null

  if (
    permission &&
    !canAccess(
      profile.role as CanAccessRole,
      permission as CanAccessPermission
    )
  ) {
    return redirectWithCookies(req, res, "/")
  }

  return res
}

export const config = {
  matcher: ["/:path*"],
}