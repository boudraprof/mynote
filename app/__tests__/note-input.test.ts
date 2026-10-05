import { describe, expect, it } from 'vitest'

import { isEmptyNoteInput } from '../utils/note-input'

describe('isEmptyNoteInput', () => {
  it('does not treat an image-only note as empty', () => {
    expect(isEmptyNoteInput({ image: 'https://example.com/image.png' })).toBe(
      false,
    )
  })

  it('treats a note without content or an image as empty', () => {
    expect(isEmptyNoteInput({ title: '', content: null })).toBe(true)
  })
})
