"use client"

import { useTheme } from "@/components/theme-provider"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-12 h-6 rounded-full transition ${
        theme === "dark" ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition ${
          theme === "dark" ? "translate-x-6" : ""
        }`}
      />
    </button>
  )
}