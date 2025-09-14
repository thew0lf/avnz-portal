"use client"
import { useEffect, useState } from 'react'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<any> }

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null)
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          // Detect updates
          if (reg.waiting) setUpdateReady(reg)
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (!installing) return
            installing.addEventListener('statechange', () => {
              if (reg.waiting) setUpdateReady(reg)
            })
          })
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Reload after skip waiting
            window.location.reload()
          })
        } catch {}
      }
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  return (
    <>
      {installEvent && (
        <div className="fixed left-2 right-2 bottom-2 z-[60] rounded-md border bg-white p-3 shadow md:left-auto md:right-4 md:w-80">
          <div className="text-sm font-medium">Install this app</div>
          <div className="text-xs text-muted-foreground">Add Avnz Portal to your home screen for a better experience.</div>
          <div className="mt-2 flex gap-2">
            <button className="touchable border rounded px-2" onClick={async()=>{ try{ await installEvent.prompt(); } finally { setInstallEvent(null) }}}>Install</button>
            <button className="touchable border rounded px-2" onClick={()=>setInstallEvent(null)}>Not now</button>
          </div>
        </div>
      )}
      {updateReady && (
        <div className="fixed left-2 right-2 bottom-2 z-[60] rounded-md border bg-white p-3 shadow md:left-auto md:right-4 md:w-80">
          <div className="text-sm font-medium">Update available</div>
          <div className="text-xs text-muted-foreground">A new version is ready. Reload to update.</div>
          <div className="mt-2 flex gap-2">
            <button className="touchable border rounded px-2" onClick={()=>{ updateReady?.waiting?.postMessage({ type: 'SKIP_WAITING' }) }}>Reload</button>
            <button className="touchable border rounded px-2" onClick={()=>setUpdateReady(null)}>Later</button>
          </div>
        </div>
      )}
    </>
  )
}

