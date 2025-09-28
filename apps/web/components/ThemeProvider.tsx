"use client"
import { useEffect, useState } from 'react'

type ThemeMode = 'light'|'dark'|'system'
type ColorScheme = 'default'|'red'|'rose'|'orange'|'green'|'blue'|'yellow'|'violet'

export default function ThemeProvider({ children }: { children: React.ReactNode }){
  // Default to light for first-time visitors
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [scheme, setScheme] = useState<ColorScheme>('default')
  useEffect(()=>{
    try {
      const t = localStorage.getItem('theme') as ThemeMode | null
      const c = localStorage.getItem('colorScheme') as ColorScheme | null
      if (t) setTheme(t)
      if (c) setScheme(c)
    } catch {}
  },[])
  useEffect(()=>{
    const root = document.documentElement
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = theme === 'dark' || (theme === 'system' && prefersDark)
    root.classList.toggle('dark', useDark)
    root.setAttribute('data-color', scheme)
  },[theme, scheme])
  return <>{children}</>
}
