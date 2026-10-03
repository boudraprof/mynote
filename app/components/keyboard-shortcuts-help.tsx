"use client"

import { useState } from 'react'
import { Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Shortcut {
  keys: Array<string>
  description: string
  category: string
}

const SHORTCUTS: Array<Shortcut> = [
  // Navigation
  { keys: ['N'], description: 'Create new note', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close note editor / dialog', category: 'Navigation' },
  { keys: ['/'], description: 'Focus search', category: 'Navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },

  // Note Editor
  { keys: ['Ctrl', 'B'], description: 'Bold text', category: 'Editor' },
  { keys: ['Ctrl', 'I'], description: 'Italic text', category: 'Editor' },
  { keys: ['Ctrl', 'U'], description: 'Underline text', category: 'Editor' },
  { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Editor' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'Editor' },

  // Note Actions
  { keys: ['Ctrl', 'S'], description: 'Save note', category: 'Actions' },
  { keys: ['Ctrl', 'Backspace'], description: 'Delete note', category: 'Actions' },
  { keys: ['Ctrl', 'P'], description: 'Pin/unpin note', category: 'Actions' },

  // List Navigation
  { keys: ['↑', '↓'], description: 'Navigate notes', category: 'Lists' },
  { keys: ['Enter'], description: 'Open selected note', category: 'Lists' },
  { keys: ['Space'], description: 'Select/deselect note', category: 'Lists' },
]

function KeyBadge({ keys }: { keys: Array<string> }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
          <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">
            {key}
          </kbd>
        </span>
      ))}
    </div>
  )
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Keyboard shortcuts (?)">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and work with notes more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter((s) => s.category === category).map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <KeyBadge keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to register global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  // Register shortcuts on mount
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (event) => {
      // Don't trigger in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // ? - Show shortcuts
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        // Dispatch custom event to open shortcuts dialog
        window.dispatchEvent(new CustomEvent('open-shortcuts'))
      }
    })
  }
}
