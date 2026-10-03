import { Suspense } from "react";

import { NotesSkeleton } from "@/components/notes-skeleton";
import fetchNotes from "@/utils/fetch-notes";
import PageReminders from "@/components/pages-ui/reminders-page";

export const dynamic = "force-dynamic";

export default async function Reminders() {
  const initialNotes = await fetchNotes({ field: "reminder" });

  return (
    <Suspense fallback={<NotesSkeleton />}>
      <PageReminders initialNotes={initialNotes} />
    </Suspense>
  );
}
