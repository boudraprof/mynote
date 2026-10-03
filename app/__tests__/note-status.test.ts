import { describe, expect, it } from "vitest";

import { getNoteStatusForSave } from "../utils/note-status";

describe("getNoteStatusForSave", () => {
  it("uses active when a new note has a blank status", () => {
    expect(getNoteStatusForSave("")).toBe("active");
  });
});
