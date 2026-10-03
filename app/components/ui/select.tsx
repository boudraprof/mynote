import * as React from 'react'
import { cn } from '@/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string
  onValueChange?: (value: string) => void
}

export function Select({ className, children, value, onValueChange, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border text-accent-foreground border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ children }: { className?: string; children?: React.ReactNode }) {
  return <>{children}</>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <>{placeholder}</>
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children?: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
