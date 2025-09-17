"use client"
import React from 'react'
import { ToastProvider } from '@/components/ui/toast-provider'
import ThemeProvider from '@/components/ThemeProvider'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ToastProvider>
  )
}
