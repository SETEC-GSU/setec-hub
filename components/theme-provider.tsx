"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

const ThemeContext = createContext({
  theme: "dark" as Theme,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null

    if (saved === "light") {
      document.documentElement.classList.add("light")
      setTheme("light")
    }
  }, [])

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark"

    if (newTheme === "light") {
      document.documentElement.classList.add("light")
    } else {
      document.documentElement.classList.remove("light")
    }

    localStorage.setItem("theme", newTheme)
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)