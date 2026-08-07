import { useCallback, useEffect, useRef, useState } from 'react'

interface UndoStack {
  /** True when an undo step is available. */
  canUndo: boolean
  /** True when a redo step is available. */
  canRedo: boolean
  /** Debounced push of an editor change onto the undo stack. */
  record: (next: string) => void
  /** Step back one snapshot; returns the value to apply, or null at the boundary. */
  undo: () => string | null
  /** Step forward one snapshot; returns the value to apply, or null at the boundary. */
  redo: () => string | null
  /** Reset the stack (e.g. after seeding a note or restoring a version). */
  reset: (value: string) => void
}

/**
 * In-memory undo/redo stack for the note editors, mirroring the web app
 * (src/routes/index.tsx): an array of content snapshots pushed on a 500ms
 * debounce, with an index cursor. Truncates any redo tail when a new
 * snapshot is recorded.
 *
 * The stack is editor-local — undo/redo works instantly and offline,
 * independent of the server-backed version history (HistoryModal).
 */
export function useUndoStack(initial: string): UndoStack {
  const [stack, setStack] = useState<string[]>([initial])
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    indexRef.current = index
    return () => clearTimeout(timer.current)
  }, [index])

  const record = useCallback((next: string) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setStack((prev) => {
        const idx = indexRef.current
        const lastSnapshot = prev[idx] ?? ''
        if (lastSnapshot === next) return prev
        const trimmed = prev.slice(0, idx + 1)
        trimmed.push(next)
        return trimmed
      })
      setIndex((prev) => {
        const nextIndex = prev + 1
        indexRef.current = nextIndex
        return nextIndex
      })
    }, 500)
  }, [])

  const undo = useCallback(() => {
    if (index <= 0) return null
    const target = stack[index - 1] ?? null
    setIndex(index - 1)
    return target
  }, [index, stack])

  const redo = useCallback(() => {
    if (index >= stack.length - 1) return null
    const target = stack[index + 1] ?? null
    setIndex(index + 1)
    return target
  }, [index, stack])

  const reset = useCallback((value: string) => {
    setStack([value])
    setIndex(0)
    indexRef.current = 0
  }, [])

  return {
    canUndo: index > 0,
    canRedo: index < stack.length - 1,
    record,
    undo,
    redo,
    reset,
  }
}
