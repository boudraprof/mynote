import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => {
  const statuses = new Map<string, { id: string; name: string }>()

  return {
    db: {
      query: {
        noteStatus: {
          findFirst: vi.fn(async ({ where }: { where: { value: string } }) =>
            statuses.get(where.value),
          ),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async ({ value }: { value: string }) =>
            statuses.has(value) ? [statuses.get(value)] : [],
          ),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(({ name }: { name: string }) => ({
          returning: vi.fn(async () => {
            const status = { id: `id-${name}`, name }
            statuses.set(name, status)
            return [status]
          }),
        })),
      })),
      resetStatuses: () => statuses.clear(),
    },
  }
})

vi.mock('drizzle-orm', () => ({
  eq: (_column: unknown, value: string) => ({ value }),
}))

vi.mock('../utils/config', () => ({ db }))
vi.mock('../db/schema', () => ({ noteStatus: { name: 'name' } }))

import { clearStatusCache, getStatusIdByName } from '../utils/status.server'

describe('getStatusIdByName', () => {
  beforeEach(() => {
    db.resetStatuses()
    clearStatusCache()
  })

  it('seeds and resolves missing lowercase status names', async () => {
    await expect(getStatusIdByName('trash')).resolves.toBe('id-trash')
  })
})
