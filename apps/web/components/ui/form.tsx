"use client"
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

export function Form({ children, method = 'post', ...props }: React.ComponentProps<'form'>) {
  return <form method={method} {...props}>{children}</form>
}

export function RHFProvider({ children, methods }: { children: React.ReactNode; methods: any }) {
  return <FormProvider {...methods}>{children}</FormProvider>
}

export function FormField({ name, control, render }: any) {
  return <Controller name={name} control={control} render={render} />
}

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props} />
}

export function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  return <Slot {...props} />
}

export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={className + ' text-sm text-muted-foreground'} {...props} />
}

export function FormMessage({ name }: { name: string }) {
  const {
    formState: { errors },
  } = useFormContext()
  const err = (errors as any)?.[name]
  if (!err) return null
  const msg = err.message || 'Invalid'
  return <p className="text-sm text-red-600" role="alert">{String(msg)}</p>
}
