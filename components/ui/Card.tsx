import { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        relative
        rounded-3xl
        border border-slate-800
        bg-gradient-to-b
        from-slate-900
        to-slate-950

        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]

        p-4 sm:p-6

        w-full

        ${className}
      `}
    >
      {/* Glow */}
      <div className="
        pointer-events-none
        absolute inset-0
        rounded-3xl
        bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_70%)]
      "/>

      {children}
    </div>
  )
}