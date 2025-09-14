"use client"
import * as React from 'react'

export function Table({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full text-sm ${className}`} {...props} />
}

export function TableHeader({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`text-left text-muted-foreground border-b ${className}`} {...props} />
}

export function TableBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b last:border-0 ${className}`} {...props} />
}

export function TableHead({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`py-2 pr-4 ${className}`} {...props} />
}

export function TableCell({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`py-2 pr-4 ${className}`} {...props} />
}

export function TableCaption({ className = '', ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={`mt-2 text-xs text-muted-foreground ${className}`} {...props} />
}

