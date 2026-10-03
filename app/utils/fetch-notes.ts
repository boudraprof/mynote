import { number, z } from 'zod'

import type { Notes } from '@/types'
import api from '@/utils/axios'


const fetchNotesSchema = z.object({
  field: z.string().optional(),
  label: z.string().optional(),
  limit: z.number().int().positive().max(200).default(20).optional(),
  offset: z.number().int().min(0).default(0).optional(),
})

export type FetchNotesInput = z.infer<typeof fetchNotesSchema>

const fetchNotes = async ({...all}: FetchNotesInput): Promise<Notes | {data: []; total: number; limit: number; offset: number}>  => {
    const { field, label, limit, offset } = fetchNotesSchema.parse(all);
    
    try {
      const params = new URLSearchParams()
      if (field) params.set('field', field)
      if (label) params.set('label', label)
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const result = await api.get<Notes>(`/notes?${params}`)
      return result.data
    } catch (error) {
      console.error('[fetchNotes] failed:', error)
      return { data: [], total: 0, limit: 20, offset: 0  }
    }
  }

export default fetchNotes
