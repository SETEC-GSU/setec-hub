import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { routePermissions } from "@/lib/routePermissions"
import { canAccess } from "@/lib/canAccess"

type UserProfile = {
  role: string | null
}

type CanAccessRole = Parameters<typeof canAccess>[0]
type CanAccessPermission = Parameters<typeof canAccess>[1]

const IS_DEV = process.env.NODE_ENV !== "production"

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/icon.ico",
  "/icon.png",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/login",
  "/auth",
  "/api/auth",
  "/recuperar-senha",
  "/resetar-senha",
  "/public",
  "/images",
  "/assets",
]

const PUBLIC_FILE_REGEX =
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf)$/i

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PREFIXES.some((path) => pathname.startsWith(path)) ||
    PUBLIC_FILE_REGEX.test(pathname)
  )
}

function isLocalhost(req: NextRequest) {
  const host = req.headers.get("host") || ""

  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error || "")
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

    if (!currentPath.startsWith("/login")) {
      redirectUrl.searchParams.set("redirectTo", currentPath)
    }
  }

  const redirectResponse = NextResponse.redirect(redirectUrl)

  for (const cookie of baseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
    })
  }

  return redirectResponse
}

function routeMatches(pathname: string, route: string) {
  if (route === "/") return pathname === "/"
  return pathname === route || pathname.startsWith(`${route}/`)
}

function getRoutePermission(pathname: string) {
  const sortedRoutes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  )

  const route = sortedRoutes.find((r) => routeMatches(pathname, r))

  if (!route) return null

  return routePermissions[route]
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (req.method === "OPTIONS") {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  /*
    MODO DE RECUPERAÇÃO LOCAL:
    No localhost, não consulta Supabase no middleware.
    Isso evita travar o sistema quando o Auth dá timeout/fetch failed.
    Em produção, a proteção continua ativa normalmente.
  */
  if (IS_DEV && isLocalhost(req)) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Middleware] Variáveis de ambiente do Supabase ausentes.")
    return redirectWithCookies(req, supabaseResponse, "/login?erro=env", true)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value)
        })

        supabaseResponse = NextResponse.next({
          request: {
            headers: req.headers,
          },
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
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
      console.error("[Middleware] Erro ao validar usuário:", authError.message)
    }

    user = authUser
  } catch (error) {
    console.error("[Middleware] Falha ao consultar Auth:", getErrorMessage(error))

    return redirectWithCookies(
      req,
      supabaseResponse,
      "/login?erro=auth-network",
      true
    )
  }

  if (!user) {
    return redirectWithCookies(
      req,
      supabaseResponse,
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
      .maybeSingle()

    if (error) {
      console.error("[Middleware] Erro ao buscar perfil:", error.message)
    }

    profile = data
  } catch (error) {
    console.error("[Middleware] Falha ao consultar perfil:", getErrorMessage(error))

    return redirectWithCookies(
      req,
      supabaseResponse,
      "/login?erro=profile-network",
      true
    )
  }

  if (!profile?.role) {
    return redirectWithCookies(
      req,
      supabaseResponse,
      "/login?erro=profile",
      true
    )
  }

  const permission = getRoutePermission(pathname)

  if (
    permission &&
    !canAccess(
      profile.role as CanAccessRole,
      permission as CanAccessPermission
    )
  ) {
    return redirectWithCookies(req, supabaseResponse, "/")
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|robots.txt|sitemap.xml).*)",
  ],
}