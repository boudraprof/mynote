import { z } from "zod";

import fetchNotes from "@/utils/fetch-notes";
import NotesPage from "@/components/pages-ui/notes-page";
import { Notes } from "@/types";

const indexSearchSchema = z.object({
  label: z.string().optional(),
  token: z.string().optional(),
});

type SearchParams = { label?: string; token?: string; field?: string };

export default async function Index({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const {label, token} = indexSearchSchema.parse(raw);
  const field = "active"
  const initialNotes =  await fetchNotes({ label, field})


  return <NotesPage label={label}  initialNotes={initialNotes as Notes} token={token} />

}
