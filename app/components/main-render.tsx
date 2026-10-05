"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { DynamicIcon } from "lucide-react/dynamic";
import { Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import type dynamicIconImport from "lucide-react/dynamicIconImports";

import type { Notes, NotesInsert } from "@/types";
import { ItemsCard } from "@/components/items-card";
import { NotesSkeleton } from "@/components/notes-skeleton";
import { listViewMode, search, spinner } from "@/utils/atoms";
import { useMatchPath } from "@/utils/client-only";
import { cn } from "@/utils";
import { NOTE_STATUS_LABELS } from "@/utils/status";
import api from "@/utils/axios";
import { notesKeys, searchKeys } from "@/utils/query-keys";
import logger from "@/utils/logger";
import { useSidebar } from "./ui/sidebar";

type RenderTypes = {
  notes: Notes;
  icons: Array<{
    title: string;
    icon: keyof typeof dynamicIconImport;
    onClick: (note: NotesInsert) => void;
  }>;
  editButton?: (note: NotesInsert) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

const LabelTitle = ({ label }: { label: string }) => (
  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
    {label}
  </h2>
);

export default function MainRender({
  notes,
  icons,
  editButton,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: RenderTypes) {
  const text = useAtomValue(search);
  const [searchedText] = useDebounce(text, 1000);

  const [isPending, setIsPending] = useAtom(spinner);
  const isTrash = useMatchPath("trash");
  const isArchive = useMatchPath("archive");
  const isHome = useMatchPath("/");

  const searchQuery = useQuery({
    queryKey: searchKeys.query(searchedText),
    queryFn: async () => {
      const { data } = await api.get<Notes>(
        `/search?q=${encodeURIComponent(searchedText)}`,
      );
      return data;
    },
    enabled: searchedText.length > 0,
  });

  // Keep the global spinner atom in sync with search fetching.
  useEffect(() => {
    setIsPending(searchQuery.isFetching);
  }, [searchQuery.isFetching, setIsPending]);

  useEffect(() => {
    if (searchQuery.isError) {
      toast("Something goes wrong!.");
      logger.error("Search failed", searchQuery.error, "Notes");
    }
  }, [searchQuery.isError, searchQuery.error]);

  const queryClient = useQueryClient();
  const reorderNotes = useMutation({
    // The route validates a bare array, so the payload must not be wrapped.
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      api.post("/notes/reorder", updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.all }),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const showPagination = !searchedText && hasMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !showPagination || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showPagination, onLoadMore]);

  const pageName = isTrash ? "Trash" : isArchive ? "Archive" : "Notes";
  const rawItems =
    searchedText && searchQuery.data?.data.length ? searchQuery.data : notes;
  const [localNotes, setLocalNotes] = useState<Array<NotesInsert>>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  useEffect(() => {
    if (!searchedText) {
      setLocalNotes(notes.data);
    }
  }, [notes, searchedText]);

  const viewMode = useAtomValue(listViewMode);
  const { open } = useSidebar();
  const displayNotes = searchedText ? rawItems.data : localNotes;

  // copyed
  const pinnedNotes = useMemo(
    () => displayNotes.filter((n: NotesInsert) => n.pinned),
    [displayNotes],
  );
  const otherNotes = useMemo(
    () => displayNotes.filter((n: NotesInsert) => !n.pinned),
    [displayNotes],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef<boolean | null>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // FLIP: smoothly animate cards into place when the sidebar toggles the
  // column count, using transforms so it works in every browser.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (viewMode !== "grid" || !grid) return;

    const openChanged =
      prevOpenRef.current !== null && prevOpenRef.current !== open;
    prevOpenRef.current = open;

    const cards = grid.querySelectorAll<HTMLElement>("[data-note-card]");
    const next = new Map<string, DOMRect>();
    cards.forEach((el) => {
      const id = el.dataset.noteCard;
      if (id) next.set(id, el.getBoundingClientRect());
    });

    if (openChanged) {
      const prev = prevRectsRef.current;
      next.forEach((rect, id) => {
        const old = prev.get(id);
        if (!old) return;
        const dx = old.left - rect.left;
        const dy = old.top - rect.top;
        const scaleX = old.width / rect.width;
        const scaleY = old.height / rect.height;
        if (dx === 0 && dy === 0 && scaleX === 1 && scaleY === 1) return;
        const el = grid.querySelector<HTMLElement>(
          `[data-note-card="${CSS.escape(id)}"]`,
        );
        el?.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
              transformOrigin: "top left",
            },
            { transform: "none", transformOrigin: "top left" },
          ],
          { duration: 300, easing: "linear" },
        );
      });

      // Re-baseline once the sidebar width transition settles, so the FLIP
      // for the next toggle starts from the actual resting layout.
      const t = window.setTimeout(() => {
        const g = gridRef.current;
        if (!g) return;
        g.querySelectorAll<HTMLElement>("[data-note-card]").forEach((el) => {
          if (el.dataset.noteCard && prevOpenRef.current === open)
            prevRectsRef.current.set(
              el.dataset.noteCard,
              el.getBoundingClientRect(),
            );
        });
      }, 220);
      prevRectsRef.current = next;
      return () => window.clearTimeout(t);
    }

    prevRectsRef.current = next;
  }, [open, viewMode]);
  // copyed
  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const n of otherNotes) {
      const st = (n as Record<string, unknown>).StatusName as
        | string
        | undefined;
      if (st) s.add(st);
    }
    return s;
  }, [otherNotes]);

  const hasMixedStatuses = statuses.size > 1;

  // copyed
  const notesByStatus = useMemo(() => {
    if (!hasMixedStatuses) return null;
    const groups: Record<string, Array<NotesInsert>> = {};
    for (const n of otherNotes) {
      const st =
        ((n as Record<string, unknown>).StatusName as string) || "active";
      groups[st] ??= [];
      groups[st].push(n);
    }
    return groups;
  }, [otherNotes, hasMixedStatuses]);

  /**
   * The list renders as one or more visually separate groups (pinned, then
   * either a single "others" grid or one grid per status). Reordering is scoped
   * to a single group, so the groups are modelled explicitly and flattened back
   * into a single array to derive global positions.
   */
  const sections = useMemo(() => {
    const result: Array<{
      key: string;
      label: string | null;
      items: Array<NotesInsert>;
    }> = [];

    if (pinnedNotes.length > 0) {
      result.push({ key: "pinned", label: "PINNED", items: pinnedNotes });
    }

    if (hasMixedStatuses && notesByStatus) {
      for (const [key, label] of Object.entries(NOTE_STATUS_LABELS)) {
        const items = notesByStatus[key];
        if (items?.length) result.push({ key, label, items });
      }
    } else if (otherNotes.length > 0) {
      result.push({
        key: "others",
        label: pinnedNotes.length > 0 ? "OTHERS" : null,
        items: otherNotes,
      });
    }

    return result;
  }, [pinnedNotes, otherNotes, notesByStatus, hasMixedStatuses]);

  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
    setDragId(noteId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverId.current = noteId;
  }, []);

  const handleDrop = useCallback(
    async (dropNoteId: string) => {
      const draggedId = dragId;
      setDragId(null);
      if (!draggedId) return;

      const fromGroup = sections.findIndex((s) =>
        s.items.some((n) => n.id === draggedId),
      );
      const toGroup = sections.findIndex((s) =>
        s.items.some((n) => n.id === dropNoteId),
      );

      // A drop in a different group would mean moving the note between pinned
      // and status buckets, which this endpoint does not model.
      if (fromGroup === -1 || toGroup === -1 || fromGroup !== toGroup) return;

      const items = [...sections[fromGroup].items];
      const from = items.findIndex((n) => n.id === draggedId);
      const to = items.findIndex((n) => n.id === dropNoteId);
      if (from === -1 || to === -1 || from === to) return;

      const [moved] = items.splice(from, 1);
      if (!moved) return;
      items.splice(to, 0, moved);

      const reordered = sections.map((section, i) =>
        i === fromGroup ? { ...section, items } : section,
      );
      const flat = reordered.flatMap((section) => section.items);

      setLocalNotes(flat);
      const updates = flat.map((note, i) => ({ id: note.id, position: i }));

      try {
        await reorderNotes.mutateAsync(updates);
      } catch (err) {
        logger.error("Failed to reorder notes", err, "Notes");
        toast("Failed to reorder notes");
        // Drop the optimistic order so the list snaps back to server state.
        setLocalNotes(notes.data);
      }
    },
    [dragId, sections, notes.data, reorderNotes],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  const sectionClass =
    viewMode === "grid"
      ? cn(
          open ? "grid-cols-5" : "grid-cols-6",
          open ? "max-lg:grid-cols-2" : "max-lg:grid-cols-3",
          "grid  max-sm:grid-cols-1 max-sm:gap-5 max-md:grid-cols-2 gap-6",
        )
      : "flex flex-col gap-4 max-w-2xl mx-auto";

  const sectionStyle = viewMode === "grid" ? {} : {};

  const renderNotes = (items: Array<NotesInsert>) =>
    items.map((note) => (
      <div
        key={note.id}
        data-note-card={note.id}
        className={cn("min-w-20", dragId === note.id ? "opacity-50" : "")}
      >
        <ItemsCard
          editButton={() => {
            if (editButton) editButton(note);
          }}
          icons={[...icons]}
          note={note}
          draggable={!searchedText}
          onDragStart={(e) => handleDragStart(e, note.id)}
          onDragOver={(e) => handleDragOver(e, note.id)}
          onDrop={() => {
            handleDrop(note.id);
          }}
          onDragEnd={handleDragEnd}
        />
      </div>
    ));

  return (
    <div>
      {searchedText && isPending ? (
        <NotesSkeleton />
      ) : searchedText && searchQuery.data?.data.length === 0 ? (
        <div className="flex justify-center items-center  h-[85dvh]">
          <h1 className="sm:text-1xl text-2xl ">
            Not found any note that matches your search
          </h1>
        </div>
      ) : notes.data.length === 0 ? (
        <div
          className={cn(
            "flex flex-col justify-center items-center",
            isHome ? "h-[40vh]" : "h-[80vh]",
          )}
        >
          <h1 className="text-5xl max-sm:text-2xl">{pageName} is Empty</h1>
          <DynamicIcon
            className="pt-2"
            size={50}
            name={isTrash ? "trash" : isArchive ? "archive" : "lightbulb"}
          />
        </div>
      ) : (
        <>
          <div className="space-y-6" ref={gridRef}>
            {sections.map((section) => (
              <section key={section.key}>
                {section.label && <LabelTitle label={section.label} />}
                <div className={sectionClass} style={sectionStyle}>
                  {renderNotes(section.items)}
                </div>
              </section>
            ))}
          </div>
          {showPagination && <div ref={sentinelRef} className="h-4" />}
          {isLoadingMore && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin size-6 text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
