import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteNoteVersions,
  getNoteVersion,
  getNoteVersions,
  restoreNoteVersion,
  saveNoteVersion,
} from '@/utils/note-history'

const mocks = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/utils/axios', () => ({
  default: {
    get: (...args: Array<unknown>) => mocks.get(...args),
    post: (...args: Array<unknown>) => mocks.post(...args),
    delete: (...args: Array<unknown>) => mocks.delete(...args),
  },
}))

describe('note-history (server-backed)', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.post.mockReset()
    mocks.delete.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves a version snapshot via POST /notes/history', async () => {
    mocks.post.mockResolvedValue({ data: { error: false } })
    await saveNoteVersion({ id: 'n1', title: 'T', content: '<p>C</p>' }, 'create')
    expect(mocks.post).toHaveBeenCalledWith('/notes/history', {
      noteId: 'n1',
      data: { id: 'n1', title: 'T', content: '<p>C</p>' },
      changeType: 'create',
    })
  })

  it('never throws when saving fails (history must not break saving)', async () => {
    mocks.post.mockRejectedValue(new Error('network down'))
    await expect(
      saveNoteVersion({ id: 'n1' }, 'update'),
    ).resolves.toBeUndefined()
  })

  it('lists versions (newest first) from GET /notes/history', async () => {
    mocks.get.mockResolvedValue({
      data: { data: [{ id: 'v1', noteId: 'n1' }] },
    })
    const versions = await getNoteVersions('n1')
    expect(mocks.get).toHaveBeenCalledWith('/notes/history', {
      params: { noteId: 'n1' },
    })
    expect(versions).toEqual([{ id: 'v1', noteId: 'n1' }])
  })

  it('returns an empty list when the fetch fails', async () => {
    mocks.get.mockRejectedValue(new Error('boom'))
    await expect(getNoteVersions('n1')).resolves.toEqual([])
  })

  it('fetches a single version by id', async () => {
    mocks.get.mockResolvedValue({ data: { data: { id: 'v1' } } })
    await expect(getNoteVersion('v1')).resolves.toEqual({ id: 'v1' })
    expect(mocks.get).toHaveBeenCalledWith('/notes/history', {
      params: { id: 'v1' },
    })
  })

  it('restores by returning the snapshot of the fetched version', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { id: 'v1', snapshot: { title: 'Old', content: '<p>x</p>' } } },
    })
    await expect(restoreNoteVersion('v1')).resolves.toEqual({
      title: 'Old',
      content: '<p>x</p>',
    })
  })

  it('returns null when restoring a missing version', async () => {
    mocks.get.mockResolvedValue({ data: { data: null } })
    await expect(restoreNoteVersion('missing')).resolves.toBeNull()
  })

  it('deletes all versions for a note via DELETE /notes/history', async () => {
    mocks.delete.mockResolvedValue({ data: { error: false } })
    await deleteNoteVersions('n1')
    expect(mocks.delete).toHaveBeenCalledWith('/notes/history', {
      params: { noteId: 'n1' },
    })
  })
})
