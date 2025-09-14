"use client"
import * as React from 'react'

export function ChartContainer({ children }: { children: React.ReactNode }){
  return <div className="w-full h-full">{children}</div>
}

export function ChartTooltip({ children }: { children: React.ReactNode }){
  return <>{children}</>
}

export function ChartTooltipContent({ label, payload }: any){
  if (!payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded border bg-white px-2 py-1 text-xs shadow">
      <div className="font-medium">{label}</div>
      <div>{String(p?.name || p?.dataKey)}: {Number(p?.value||0).toFixed(2)}</div>
    </div>
  )
}

