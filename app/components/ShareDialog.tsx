"use client"
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import api from '@/utils/axios'
import { sharesKeys } from '@/utils/query-keys'
import z from 'zod'

type Share = {
  id: string
  email: string
  name: string | null
}

export function ShareDialog({
  noteId,
  open,
  onOpenChange,
}: {
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {

  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const sharesQuery = useQuery({
    queryKey: sharesKeys.detail(noteId),
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<Share> }>(
        `/notes/share?noteId=${encodeURIComponent(noteId)}`,
      )
      return data.data
    },
    enabled: open && !!noteId,
  })
  const shares = sharesQuery.data ?? []

  const shareMutation = useMutation({
    mutationFn: () => api.post('/notes/share', { noteId, email }),
    onSuccess: () => {
      setEmail('')
      void queryClient.invalidateQueries({ queryKey: sharesKeys.detail(noteId) })
    },
  })

  const unshareMutation = useMutation({
    mutationFn: (sharedWithEmail: string) =>
      api.delete('/notes/share', { data: { noteId, email: sharedWithEmail } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sharesKeys.detail(noteId) })
    },
  })

  useEffect(() => {
    if (open) {
      setError('')
      setEmail('')
    }
  }, [open, noteId])

  const share = async () => {
    setError('')
    try {
        z.email().parse(email)
         await shareMutation.mutateAsync()
    } catch (err: any) {
      if(err instanceof z.ZodError) {
        setError('Invalid email address')
        return
      }
      setError(
        err?.response?.data?.message || err?.message || 'Failed to share',
      )
    }
  }

  const unshare = (sharedWithEmail: string) => {
    unshareMutation.mutate(sharedWithEmail)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="person@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={share} disabled={shareMutation.isPending || !email}>
              Share
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-1">
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not shared with anyone yet.
              </p>
            ) : (
              shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="truncate">{s.email}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unshare(s.email)}
                    aria-label="Remove share"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
