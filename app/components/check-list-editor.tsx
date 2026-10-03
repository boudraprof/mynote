"use client"

import { useCallback } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '@/utils'

export type ChecklistItem = { text: string; checked: boolean }

type Props = {
  items: Array<ChecklistItem>
  onChange: (items: Array<ChecklistItem>) => void
}

export default function ChecklistEditor({ items, onChange }: Props) {
  const addItem = useCallback(() => {
    onChange([...items, { text: '', checked: false }])
  }, [items, onChange])

  const updateItem = useCallback(
    (index: number, updates: Partial<ChecklistItem>) => {
      const next = items.map((item, i) =>
        i === index ? { ...item, ...updates } : item,
      )
      onChange(next)
    },
    [items, onChange],
  )

  const removeItem = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index))
    },
    [items, onChange],
  )

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <button
            type="button"
            onClick={() => updateItem(index, { checked: !item.checked })}
            className={cn(
              'size-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
              item.checked
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/40 hover:border-muted-foreground',
            )}
          >
            {item.checked && <Check size={12} strokeWidth={3} />}
          </button>
          <Input
            value={item.text}
            onChange={(e) => updateItem(index, { text: e.target.value })}
            placeholder="New item"
            className="bg-background/0! border-0 focus-visible:ring-0 shadow-none text-sm h-8 px-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeItem(index)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addItem}
        className="text-xs text-muted-foreground gap-1"
      >
        <Plus size={12} />
        Add item
      </Button>
    </div>
  )
}
