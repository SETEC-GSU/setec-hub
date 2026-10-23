import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { routePermissions } from "@/lib/routePermissions"
import { canAccess } from "@/lib/canAccess"
import { podeVerCentralRelatorios, rotaCentralRelatorios } from "@/lib/relatorios/acesso"
import {
  comLimiteSessao,
  registrarFalhaSessao,
  sessaoAusenteOuInvalida,
  SessaoIndisponivelError,
} from "@/lib/sessao-servidor"

type CanAccessRole = Parameters<typeof canAccess>[0]
type CanAccessPermission = Parameters<typeof canAccess>[1]
const IS_DEV = process.env.NODE_ENV !== "production"

const PUBLIC_PREFIXES = [
  "/_next", "/favicon.ico", "/icon.ico", "/icon.png", "/manifest.json",
  "/robots.txt", "/sitemap.xml", "/login", "/auth", "/api/auth",
  "/recuperar-senha", "/resetar-senha", "/public", "/images", "/assets",
]
const PUBLIC_FILE_REGEX =
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf)$/i
const SORTED_ROUTES = Object.keys(routePermissions).sort((a, b) => b.length - a.length)

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some(path => pathname.startsWith(path)) || PUBLIC_FILE_REGEX.test(pathname)
}

function isLocalhost(req: NextRequest) {
  const host = req.headers.get("host") || ""
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0")
}

function copySessionCookies(baseResponse: NextResponse, response: NextResponse) {
  for (const cookie of baseResponse.cookies.getAll()) response.cookies.set(cookie)
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")
  return response
}

function redirectWithCookies(req: NextRequest, baseResponse: NextResponse, path: string, keepRedirectTo = false) {
  const redirectUrl = new URL(path, req.url)
  if (keepRedirectTo) {
    const currentPath = req.nextUrl.pathname + req.nextUrl.search
    if (!currentPath.startsWith("/login")) redirectUrl.searchParams.set("redirectTo", currentPath)
  }
  return copySessionCookies(baseResponse, NextResponse.redirect(redirectUrl))
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] || char)
}

function temporaryUnavailable(req: NextRequest, baseResponse: NextResponse) {
  let response: NextResponse
  const mensagem = "Não foi possível verificar sua sessão agora. Aguarde alguns segundos e tente novamente."

  if (req.nextUrl.pathname.startsWith("/api/")) {
    response = NextResponse.json(
      { erro: mensagem, codigo: "SESSAO_INDISPONIVEL", temporario: true },
      { status: 503 }
    )
  } else {
    const retryPath = escapeHtml(req.nextUrl.pathname.replace(/^\/+/, "/") + req.nextUrl.search)
    response = new NextResponse(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conexão temporariamente indisponível | SETEC Hub</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#080f20;color:#e2e8f0;font:16px/1.6 system-ui,sans-serif;padding:24px;box-sizing:border-box}main{width:100%;max-width:520px;padding:32px;box-sizing:border-box;background:#111c32;border:1px solid #26334b;border-radius:20px}small{color:#67e8f9;letter-spacing:.12em}h1{font-size:clamp(23px,5vw,30px);line-height:1.2;margin:16px 0}p{color:#cbd5e1}a{display:inline-block;margin-top:12px;padding:12px 18px;border-radius:12px;background:#0891b2;color:white;text-decoration:none;font-weight:600}a:focus-visible{outline:3px solid #f8fafc;outline-offset:4px}</style>
</head><body><main><small>SETEC HUB</small><h1>Conexão temporariamente indisponível</h1>
<p>${mensagem}</p><p>Esta falha temporária não exige sair do sistema. Sua sessão poderá ser verificada novamente ao recarregar esta página.</p>
<a href="${retryPath}">Tentar novamente</a></main></body></html>`, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
  response.headers.set("Retry-After", "5")
  return copySessionCookies(baseResponse, response)
}

function routeMatches(pathname: string, route: string) {
  if (route === "/") return pathname === "/"
  return pathname === route || pathname.startsWith(`${route}/`)
}

function getRoutePermission(pathname: string) {
  const route = SORTED_ROUTES.find(r => routeMatches(pathname, r))
  return route ? routePermissions[route] : null
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (req.method === "OPTIONS" || isPublicPath(pathname)) return NextResponse.next()

  // Preserva o modo de recuperação local já existente; produção continua protegida.
  if (IS_DEV && isLocalhost(req)) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request: { headers: req.headers } })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    registrarFalhaSessao("middleware/ambiente", new Error("Configuração ausente"))
    return temporaryUnavailable(req, supabaseResponse)
  }

  let etapa = "middleware/autenticacao"
  let contexto: { userId: string | null; role: string | null }

  try {
    contexto = await comLimiteSessao(async fetchSessao => {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        global: { fetch: fetchSessao },
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            const anteriores = supabaseResponse.cookies.getAll()
            supabaseResponse = NextResponse.next({ request: { headers: req.headers } })
            anteriores.forEach(cookie => supabaseResponse.cookies.set(cookie))
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      })

      // Mantém a validação remota existente, inclusive de conta/sessão revogada.
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        if (sessaoAusenteOuInvalida(authError)) return { userId: null, role: null }
        registrarFalhaSessao(etapa, authError)
        throw new SessaoIndisponivelError(etapa)
      }
      if (!user) return { userId: null, role: null }

      etapa = "middleware/perfil"
      const { data: profile, error } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        registrarFalhaSessao(etapa, error)
        throw new SessaoIndisponivelError(etapa)
      }
      return { userId: user.id, role: profile?.role || null }
    })
  } catch (error) {
    if (!(error instanceof SessaoIndisponivelError) || error.etapa === "timeout") {
      registrarFalhaSessao(etapa, error)
    }
    return temporaryUnavailable(req, supabaseResponse)
  }

  if (!contexto.userId) return redirectWithCookies(req, supabaseResponse, "/login?erro=session", true)
  if (!contexto.role) return redirectWithCookies(req, supabaseResponse, "/login?erro=profile", true)

  // A Central mantém a restrição independente dos formulários de relatórios.
  if (rotaCentralRelatorios(pathname)) {
    if (!podeVerCentralRelatorios(contexto.role)) {
      if (pathname.startsWith("/api/")) {
        return copySessionCookies(supabaseResponse, NextResponse.json(
          { erro: "Seu perfil não possui acesso à Central de Relatórios." },
          { status: 403 }
        ))
      }
      return redirectWithCookies(req, supabaseResponse, "/")
    }
    return copySessionCookies(supabaseResponse, supabaseResponse)
  }

  if (contexto.role === "field" && ["/inventario", "/inventario/atualizar"].includes(pathname)) {
    return redirectWithCookies(req, supabaseResponse, "/fields/inventario")
  }

  const permission = getRoutePermission(pathname)
  if (permission && !canAccess(contexto.role as CanAccessRole, permission as CanAccessPermission)) {
    return redirectWithCookies(req, supabaseResponse, "/")
  }
  return copySessionCookies(supabaseResponse, supabaseResponse)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|robots.txt|sitemap.xml).*)"],
}
