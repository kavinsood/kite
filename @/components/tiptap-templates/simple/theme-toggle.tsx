"use client"

import * as React from "react"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"

// --- Icons ---
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"

export function ThemeToggle() {
  // Track whether dark mode is currently enabled
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false

    // 1. Check localStorage (explicit user preference)
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null

    // 2. Fallback to system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    return savedTheme ? savedTheme === "dark" : prefersDark
  })

  // Detect system theme changes. Only update if the user has not explicitly selected a theme.
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem("theme")
      if (savedTheme) return // Respect explicit user choice

      setIsDarkMode(e.matches)
    }

    // Older Safari (< 14) uses addListener/removeListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange)
    } else {
      // @ts-ignore - for legacy browsers
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange)
      } else {
        // @ts-ignore - for legacy browsers
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  // Apply/remove classes & persist preference when isDarkMode changes
  React.useEffect(() => {
    if (typeof document === "undefined") return

    document.documentElement.classList.toggle("dark", isDarkMode)
    document.body.classList.toggle("dark", isDarkMode)

    // Persist explicit preference
    localStorage.setItem("theme", isDarkMode ? "dark" : "light")

    // Sync background colour to avoid flash when switching routes (especially in Next.js / CSR apps)
    document.documentElement.style.backgroundColor = isDarkMode ? "#0e0e11" : "#ffffff"
  }, [isDarkMode])

  // Toggle handler – this sets an explicit preference
  const toggleDarkMode = () => {
    // After a manual toggle, we explicitly store the preference in localStorage
    setIsDarkMode(prev => !prev)
  }

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      data-style="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}
