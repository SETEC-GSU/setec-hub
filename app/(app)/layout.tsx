import type { ReactNode } from "react"
import { Suspense } from "react"
import Sidebar from "@/components/layout/Sidebar"
import LogoutButton from "@/components/LogoutButton"
import RoleBadge from "@/components/RoleBadge"
import Greeting from "@/components/Greeting"
import NotificacaoChamados from "@/components/NotificacaoChamados"
import MensagensChamados from "@/components/MensagensChamados"

export const dynamic = "force-dynamic"
export const revalidate = 0

function HeaderSkeleton() {
  return (
    <div className="h-5 w-56 animate-pulse rounded-full bg-slate-800" />
  )
}

function RoleBadgeSkeleton() {
  return (
    <div className="h-8 w-28 animate-pulse rounded-full bg-slate-800" />
  )
}

function SidebarSkeleton() {
  return (
    <aside className="flex h-full w-[270px] flex-col border-r border-slate-800 bg-[#020617]">
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-800" />

        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-800" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-slate-800" />
        </div>
      </div>

      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-2xl bg-slate-900"
          />
        ))}
      </div>
    </aside>
  )
}

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="relative flex h-dvh overflow-hidden bg-[#0B1120] text-white">
      <input type="checkbox" id="mobile-menu" className="peer hidden" />

      <label
        htmlFor="mobile-menu"
        className="fixed inset-0 z-40 hidden cursor-pointer bg-black/70 backdrop-blur-sm peer-checked:block md:peer-checked:hidden"
        aria-label="Fechar menu lateral"
      />

      <div className="fixed inset-y-0 left-0 z-50 -translate-x-full transform transition-transform duration-300 ease-in-out peer-checked:translate-x-0 md:relative md:translate-x-0">
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 h-20 shrink-0 border-b border-slate-800/80 bg-[#020617]/95 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl md:h-24 md:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.07),transparent_28%)]" />

          <div className="relative z-10 flex h-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 md:gap-5">
              <label
                htmlFor="mobile-menu"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-slate-300 shadow-lg transition-all hover:border-blue-500/40 hover:bg-slate-800 hover:text-white md:hidden"
                aria-label="Abrir menu lateral"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                  />
                </svg>
              </label>

              <div className="min-w-0 max-w-[52vw] sm:max-w-none">
                <Suspense fallback={<HeaderSkeleton />}>
                  <Greeting />
                </Suspense>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/70 px-2 py-1.5 shadow-inner sm:gap-2 md:px-3">
                <NotificacaoChamados />
                <MensagensChamados />
              </div>

              <div className="hidden sm:block">
                <Suspense fallback={<RoleBadgeSkeleton />}>
                  <RoleBadge />
                </Suspense>
              </div>

              <div className="hidden h-8 w-px bg-slate-800 md:block" />

              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-auto bg-[#0B1120] p-3 sm:p-5 md:p-8 xl:p-10">
          <div className="mx-auto w-full max-w-[1800px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}