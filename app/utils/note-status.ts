import { NOTE_STATUS } from "./bgs-colors";
import type { NoteStatusType } from "../types";

export function getNoteStatusForSave(
  statusName: string | null | undefined,
): NoteStatusType {
  if (statusName === "" || statusName == null) return NOTE_STATUS.ACTIVE;
  if (!isNoteStatusType(statusName)) {
    throw new Error(`Invalid note status: ${statusName}`);
  }
  return statusName;
}

function isNoteStatusType(value: string): value is NoteStatusType {
  return Object.values(NOTE_STATUS).some((status) => status === value);
}
