"use client"

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { DynamicIcon } from 'lucide-react/dynamic'

const getNextTheme = (current: string, resolvedTheme: string | undefined): string => {
  const isDark = resolvedTheme === 'dark'
  const themes: string[] = isDark ? ['auto', 'light', 'dark'] : ['auto', 'dark', 'light']
  return themes[(themes.indexOf(current) + 1) % themes.length]!
}

export function ThemeToggle(props: React.ComponentProps<typeof Button>) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const handleToggleMode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const current = theme === 'system' || !theme ? 'auto' : theme
    const next = getNextTheme(current, resolvedTheme)
    setTheme(next === 'auto' ? 'system' : next)
  }

  const isAuto = theme === 'system' || theme === 'auto'
  const isDark = resolvedTheme === 'dark'

  return (
    <Button variant="ghost" size="default" onClick={handleToggleMode} {...props}>
      {isAuto ? (
        <DynamicIcon className='size-4' name={'sun-moon'} />
      ) : (
        <DynamicIcon className='size-4' name={isDark ? 'moon' : 'sun'} />
      )} 
    </Button>
  )
}