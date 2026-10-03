"use client"
import { useEffect, useRef } from 'react'
import { sanitizeNoteHtml } from '@/utils/sanitize'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValue = useRef(value)
  const isMounted = useRef(false)

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = sanitizeNoteHtml(value) || ''
      lastValue.current = sanitizeNoteHtml(value) || ''
    }
  }, [])

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    if (ref.current && lastValue.current !== value) {
      ref.current.innerHTML = sanitizeNoteHtml(value) || ''
      lastValue.current = sanitizeNoteHtml(value) || ''
    }
  }, [value])

  const handleInput = () => {
    if (ref.current) {
      lastValue.current = ref.current.innerHTML
      onChange(ref.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          document.execCommand('bold')
          break
        case 'i':
          e.preventDefault()
          document.execCommand('italic')
          break
        case 'u':
          e.preventDefault()
          document.execCommand('underline')
          break
      }
    }
  }

  return (
    <div
      ref={ref}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={className}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  )
}
