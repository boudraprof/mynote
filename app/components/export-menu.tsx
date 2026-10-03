import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { toast } from 'react-toastify'

import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import type { Notes, NotesInsert  } from '@/types'
import api from '@/utils/axios'

type ExportNote = NotesInsert & { labels?: Array<string> }

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function htmlToText(html?: string | null): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

export function ExportMenu() {
  const exportNotes = useMutation({
    mutationFn: async (format: 'json' | 'md') => {
      const { data } = await api.get<Notes>('/notes?limit=100000')
      const notes = data.data as Array<ExportNote>
      const stamp = new Date().toISOString().slice(0, 10)

      if (format === 'json') {
        download(
          `notes-${stamp}.json`,
          JSON.stringify(notes, null, 2),
          'application/json',
        )
      } else {
        const md = notes
          .map((n) => {
            const title = n.title || 'Untitled'
            const body = htmlToText(n.content)
            const reminder = n.reminderAt
              ? `\n> Reminder: ${new Date(n.reminderAt).toLocaleString()}\n`
              : ''
            const labels = n.labels && n.labels.length > 0
              ? `\n\nLabels: ${n.labels.join(', ')}\n`
              : ''
            return `# ${title}\n${reminder}\n${body}${labels}\n\n---`
          })
          .join('\n\n')
        download(`notes-${stamp}.md`, md, 'text/markdown')
      }

      return notes.length
    },
    onSuccess: (count, format) =>
      toast.success(`Exported ${count} notes as ${format.toUpperCase()}`),
    onError: () => toast.error('Export failed'),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Export notes"
          disabled={exportNotes.isPending}
          title="Export notes"
        >
          <Download size={18} className="text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mt-3">
        <DropdownMenuItem onClick={() => exportNotes.mutate('json')}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportNotes.mutate('md')}>
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
