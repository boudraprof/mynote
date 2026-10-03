import { Suspense } from "react";

import { NotesSkeleton } from "@/components/notes-skeleton";
import fetchNotes from "@/utils/fetch-notes";
import ArchivePage from "@/components/pages-ui/archive-page";

export const dynamic = "force-dynamic";

export default async function Archive() {

  const initialNotes = await fetchNotes({ field: "archived" });

  return (
    <Suspense fallback={<NotesSkeleton />}>
      <ArchivePage initialNotes={initialNotes} />
    </Suspense>
  );
}
