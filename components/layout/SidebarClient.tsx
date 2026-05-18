"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export type SidebarItem = {
  href: string
  label: string
  icon: string
  permission: string
}

export type SidebarSection = {
  title: string
  items: SidebarItem[]
}

type SidebarClientProps = {
  sections: SidebarSection[]
  showHome: boolean
  userRole?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function normalizePath(path: string) {
  if (!path) return "/"
  if (path === "/") return "/"
  return path.endsWith("/") ? path.slice(0, -1) : path
}

function splitSectionTitle(title: string) {
  const [emoji, ...rest] = title.split(" ")

  return {
    emoji: emoji || "•",
    text: rest.join(" ") || title,
  }
}

function isHrefMatch(pathname: string, href: string) {
  const current = normalizePath(pathname)
  const target = normalizePath(href)

  if (target === "/") return current === "/"

  return current === target || current.startsWith(`${target}/`)
}

function getActiveHref(pathname: string, hrefs: string[]) {
  const matches = hrefs
    .filter((href) => isHrefMatch(pathname, href))
    .sort((a, b) => b.length - a.length)

  return matches[0] || ""
}

export default function SidebarClient({
  sections,
  showHome,
  userRole,
}: SidebarClientProps) {
  const pathname = usePathname() || "/"

  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const allHrefs = useMemo(() => {
    const hrefs = sections.flatMap((section) =>
      section.items.map((item) => item.href)
    )

    if (showHome) hrefs.push("/")

    return hrefs
  }, [sections, showHome])

  const activeHref = useMemo(
    () => getActiveHref(pathname, allHrefs),
    [pathname, allHrefs]
  )

  useEffect(() => {
    const saved = window.localStorage.getItem("setec-sidebar-collapsed")
    setCollapsed(saved === "true")
  }, [])

  useEffect(() => {
    window.localStorage.setItem("setec-sidebar-collapsed", String(collapsed))
  }, [collapsed])

  useEffect(() => {
    setOpenSections((current) => {
      const next = { ...current }

      sections.forEach((section) => {
        const hasActiveItem = section.items.some((item) => item.href === activeHref)

        if (hasActiveItem) {
          next[section.title] = true
        }
      })

      return next
    })
  }, [activeHref, sections])

  function toggleSection(title: string) {
    setOpenSections((current) => ({
      ...current,
      [title]: !current[title],
    }))
  }

  return (
    <aside
      className={cx(
        "relative flex h-full shrink-0 flex-col justify-between overflow-hidden border-r border-slate-800 bg-[#020617] transition-[width] duration-300",
        collapsed ? "w-[84px]" : "w-72"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.06),transparent_26%)]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          className={cx(
            "sticky top-0 z-20 flex h-24 shrink-0 items-center border-b border-slate-800 bg-[#020617]/95 backdrop-blur-md transition-all",
            collapsed ? "justify-center px-0" : "px-6"
          )}
        >
          <Link
            href="/"
            className={cx(
              "group/logo flex min-w-0 items-center",
              collapsed ? "justify-center" : "gap-3"
            )}
            title="SETEC Hub"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600 to-blue-500 shadow-[0_0_22px_rgba(37,99,235,0.38)] transition-all group-hover/logo:scale-105">
              <span className="text-lg font-black tracking-tight text-white">
                SH
              </span>
            </div>

            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <div className="flex items-baseline text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    SETEC
                  </span>
                  <span className="ml-1 font-light text-slate-200">Hub</span>
                </div>

                <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  URE Guarulhos Sul
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cx(
              "absolute top-8 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 shadow-lg transition-all hover:border-blue-500/40 hover:bg-slate-800 hover:text-white",
              collapsed ? "right-[-18px] rotate-180" : "right-4"
            )}
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <nav
          className={cx(
            "custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-6 transition-all",
            collapsed ? "px-2" : "px-4"
          )}
        >
          {showHome && (
            <Link
              href="/"
              title="Menu Principal"
              aria-current={activeHref === "/" ? "page" : undefined}
              className={cx(
                "group/link relative mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                collapsed && "justify-center px-0",
                activeHref === "/"
                  ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_18px_rgba(37,99,235,0.12)]"
                  : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white",
                !collapsed && activeHref !== "/" && "hover:translate-x-1"
              )}
            >
              {activeHref === "/" && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
              )}

              <span className="text-xl transition-all group-hover/link:scale-110">
                🏠
              </span>

              {!collapsed && <span className="truncate">Menu Principal</span>}
            </Link>
          )}

          <div className="space-y-4">
            {sections.map((section) => {
              const { emoji, text } = splitSectionTitle(section.title)
              const isOpen = Boolean(openSections[section.title])
              const sectionActive = section.items.some(
                (item) => item.href === activeHref
              )

              return (
                <div key={section.title}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    title={text}
                    className={cx(
                      "mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all",
                      collapsed && "justify-center px-0",
                      sectionActive
                        ? "bg-slate-900 text-slate-200"
                        : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-200"
                    )}
                  >
                    <span
                      className={cx(
                        "text-lg transition-all",
                        sectionActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]"
                      )}
                    >
                      {emoji}
                    </span>

                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide">
                          {text}
                        </span>

                        <span
                          className={cx(
                            "text-sm text-slate-400 transition-transform",
                            isOpen && "rotate-90 text-blue-300"
                          )}
                        >
                          ▸
                        </span>
                      </>
                    )}
                  </button>

                  <div
                    className={cx(
                      "grid transition-all duration-300",
                      isOpen || collapsed
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const active = item.href === activeHref

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              title={item.label}
                              aria-current={active ? "page" : undefined}
                              className={cx(
                                "group/link relative flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all",
                                collapsed && "justify-center px-0",
                                active
                                  ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_16px_rgba(37,99,235,0.10)]"
                                  : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-white",
                                !collapsed && !active && "hover:translate-x-1"
                              )}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                              )}

                              <span
                                className={cx(
                                  "text-base opacity-70 transition-all group-hover/link:scale-110 group-hover/link:opacity-100",
                                  active && "opacity-100"
                                )}
                              >
                                {item.icon}
                              </span>

                              {!collapsed && (
                                <span className="min-w-0 flex-1 truncate">
                                  {item.label}
                                </span>
                              )}

                              {!collapsed && active && (
                                <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.85)]" />
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </nav>
      </div>

      <div
        className={cx(
          "relative z-10 shrink-0 border-t border-slate-800 bg-[#020617]/95 backdrop-blur-md transition-all",
          collapsed ? "px-2 py-4" : "p-5"
        )}
      >
        {collapsed ? (
          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-blue-300"
            title="Plataforma interna - URE Guarulhos Sul"
          >
            GSU
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Plataforma interna
            </p>

            <p className="mt-1 text-sm font-medium text-slate-300">
              URE Guarulhos Sul
            </p>

            {userRole && (
              <p className="mt-2 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                {userRole}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}