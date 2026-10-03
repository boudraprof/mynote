"use client"

import Render from "@/components/main-render";
import { useOptimisticNotes, useInfiniteNotes } from "@/hooks";
import { toast } from "react-toastify";
import ToastButton from "../toast-button";
import { Notes } from "@/types";

export default function ArchivePage({ initialNotes }: { initialNotes: Notes }) {
  const {
    togglePin,
    moveToTrash: optimisticTrash,
    restoreNote,
    updateNote,
  } = useOptimisticNotes();

  const {
    data: paginatedData,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useInfiniteNotes(initialNotes, { field: "archived" });

  return (
    <Render
      notes={{ ...initialNotes, data: paginatedData, total }}
      icons={[
        {
          title: "pin note",
          icon: "pin",
          onClick: (note) => {
            togglePin.mutate({ id: note.id, pinned: !note.pinned });
          },
        },
        {
          title: "move note to trash",
          icon: "trash",
          onClick: (note) => {
            optimisticTrash.mutate(note, {
              onSuccess: () => {
                toast.success(
                  <ToastButton
                    title="Note moved to trash!"
                    onClick={() => {
                      updateNote.mutate({
                        id: note.id,
                        statusName: "archived",
                      });
                      toast.success("Note restored!");
                    }}
                  />,
                  {
                    toastId: "archive-move-to-trash",
                    autoClose: 5000,
                    closeOnClick: false,
                  },
                );
              },
            });
          },
        },
        {
          title: "restore note from archive",
          icon: "archive-restore",
          onClick: (note) => {
            restoreNote.mutate(note, {
              onSuccess: () =>
                toast.success("Note restored from archive!", {
                  toastId: "archive-restore",
                  autoClose: 3000,
                }),
            });
          },
        },
      ]}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    />
  );
}
