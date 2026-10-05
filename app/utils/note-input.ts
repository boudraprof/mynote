type NoteContentFields = {
  title?: string | null
  content?: string | null
  checklistItems?: string | null
  image?: string | null
}

export function isEmptyNoteInput(note: NoteContentFields): boolean {
  return !note.checklistItems && !note.content && !note.title && !note.image
}
