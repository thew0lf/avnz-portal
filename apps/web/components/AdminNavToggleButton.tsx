"use client"
import { PanelLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export default function AdminNavToggleButton() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  if (!isAdmin) return null
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('admin-nav:open')) } catch {}
            }}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white text-gray-700"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Open navigation</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
