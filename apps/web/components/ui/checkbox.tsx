"use client"
import * as React from 'react'

export function Checkbox({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="checkbox" className={`h-4 w-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-ring ${className}`} {...props} />
  )
}

