import type { ReactNode } from 'react'

interface ActivityProps {
  mode: 'visible' | 'hidden'
  children: ReactNode
}

export function Activity({ mode, children }: ActivityProps) {
  if (mode === 'hidden') return null
  return <>{children}</>
}
