import { NotesSkeleton } from '@/components/notes-skeleton'
import { Suspense } from 'react'
import fetchNotes from '@/utils/fetch-notes'
import TrashPage from '@/components/pages-ui/trash-page'

export const dynamic = 'force-dynamic'

export default async function Trash() {
  const initialNotes =  await fetchNotes({ field: 'trash' })

  return (
    <Suspense fallback={<NotesSkeleton />}>
     <TrashPage initialNotes={initialNotes} />
    </Suspense>
  )
}
