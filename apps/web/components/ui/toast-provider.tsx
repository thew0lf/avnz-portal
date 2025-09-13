"use client"
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; message: string; variant?: 'default' | 'success' | 'error' }

type ToastCtx = {
  toast: (message: string, variant?: Toast['variant']) => void
  success: (message: string) => void
  error: (message: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((message: string, variant: Toast['variant'] = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])
  const success = useCallback((m: string) => toast(m, 'success'), [toast])
  const error = useCallback((m: string) => toast(m, 'error'), [toast])
  const value = useMemo(() => ({ toast, success, error }), [toast, success, error])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={
            'px-3 py-2 rounded shadow text-sm ' +
            (t.variant === 'success' ? 'bg-green-600 text-white' : t.variant === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white')
          }>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

