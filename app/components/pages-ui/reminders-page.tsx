"use client"

import { useOptimisticNotes, useInfiniteNotes } from "@/hooks";
import { toast } from "react-toastify";
import ToastButton from "../toast-button";
import { Notes } from "@/types";
import Render from '@/components/main-render'

export default function PageReminders({
  initialNotes,
}: {
  initialNotes: Notes
}) {
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
  } = useInfiniteNotes(initialNotes, { field: "reminder" });

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
                      restoreNote.mutate(note);
                      toast.success("Note restored!");
                    }}
                  />,
                  {
                    toastId: "reminder-move-to-trash",
                    autoClose: 5000,
                    closeOnClick: false,
                  },
                );
              },
            });
          },
        },
        {
          title: "remove note form reminder",
          icon: "bell-off",
          onClick: (note) => {
            updateNote.mutate(
              { id: note.id, reminderAt: null },
              {
                onSuccess: () =>
                  toast.success("Reminder removed!", {
                    toastId: "reminder-remove",
                    autoClose: 3000,
                  }),
              },
            );
          },
        },
      ]}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    />
  );
}
