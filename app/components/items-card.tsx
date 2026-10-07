"use client"

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DynamicIcon } from "lucide-react/dynamic";
import { useAtomValue } from "jotai";
import { toast } from "react-toastify";
import {
  Bell,
  Check,
  DropletOff,
  ImageOff,
  MoreVertical,
  Palette,
  Pin,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { toProxiedImageSrc } from "@/utils/image-url";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type dynamicIconImport from "lucide-react/dynamicIconImports";
import type { ChecklistItem } from "./check-list-editor";

import type { NoteStatusType, NotesInsert } from "@/types";
import api from "@/utils/axios";
import { format, toLocalInput } from "@/utils/date";
import { notesKeys } from "@/utils/query-keys";
import { sanitizeNoteHtml } from "@/utils/sanitize";
import { Activity } from "@/components/activity";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  backgroundImages,
  notesPaletteColors,
  paletteColorValues,
} from "@/utils/bgs-colors";
import { cn } from "@/utils";
import { useMatchPath } from "@/utils/client-only";
import { listViewMode } from "@/utils/atoms";


type T = {
  editButton: () => void;
  onPointerUp?: () => void;
  note: NotesInsert & {
    StatusName?: NoteStatusType;
    labels?: Array<string>;
    shared?: boolean;
  };
  icons?: Array<{
    title: string;
    icon: keyof typeof dynamicIconImport;
    onClick: (e: NotesInsert) => void;
  }>;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
};

export function ItemsCard({
  onPointerUp,
  editButton,
  note,
  icons,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: T) {
  const [showBtns, setShowBtns] = useState(false);
  const [showDrpMenu, setShowDrpMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderValue, setReminderValue] = useState("");
  const queryClient = useQueryClient();
  const updateNote = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.put("/notes", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.all }),
  });
  const viewMode = useAtomValue(listViewMode);
  const isPinned = note.pinned === true;
  const parsedChecklist = useMemo<Array<ChecklistItem>>(() => {
    if (!note.checklistItems) return [];
    try {
      return JSON.parse(note.checklistItems);
    } catch {
      return [];
    }
  }, [note.checklistItems]);

  const reminderDate = useMemo(() => {
    if (!note.reminderAt) return null;
    const date = new Date(note.reminderAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [note.reminderAt]);

  const reminderLabel = useMemo(
    () => (reminderDate ? format(reminderDate, "MMM d, HH:mm") : ""),
    [reminderDate],
  );

  const handleClearReminder = async () => {
    setReminderValue("");
    await updateNote.mutateAsync({ id: note.id, reminderAt: null });
    toast.success("Reminder removed!", {
      toastId: "reminder-remove",
      autoClose: 3000,
    });
  };

  const paletteStyle = useMemo(() => {
    const p = note.palette;
    if (!p) return undefined;
    if (p in paletteColorValues) {
      return { backgroundColor: paletteColorValues[p] };
    }
    return {
      backgroundImage: `url(${p})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }, [note.palette]);

  const colors = note.palette
    ? note.palette.length > 12
      ? "text-white"
      : "text-black"
    : "";

  const handlePaletteBg = async (
    bg: string /** TODO: use colors value as type */,
  ) => {
    const current = note.palette as string;
    const newPalette = current === bg ? null : bg;
    await updateNote.mutateAsync({
      id: note.id,
      palette: newPalette,
    });
    setShowDrpMenu(false);
  };

  const isTrashPath = useMatchPath("trash");

  return (
    <Card
      onPointerUp={onPointerUp}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={paletteStyle}
      className={cn(
        "gap-3!",
        colors,
        note.image && "pt-0!",
        "group bg-card shadow-md hover:shadow-lg",
        "transition-shadow",
        "break-inside-avoid-column",
        "h-fit!",
        "bg-background",
        "relative",
        viewMode === "list" ? "w-full" : "",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      onMouseOver={() => setShowBtns(true)}
      onMouseLeave={() => {
        if (!showDrpMenu && !showMoreMenu && !showReminder) setShowBtns(false);
      }}
    >
      {note.pinned && !showBtns && (
        <Pin
          className="absolute top-2 right-2 z-10 text-muted-foreground/60"
          size={16}
          fill="currentColor"
        />
      )}
      {note.reminderAt && !showBtns && (
        <span
          title={`Reminder: ${new Date(note.reminderAt).toLocaleString()}`}
          className="absolute top-2 left-2 z-10 text-muted-foreground/60"
        >
          <Bell size={16} />
        </span>
      )}
      {showBtns && (
        <Check
          className="absolute -top-1 -left-2 z-10 text-accent bg-accent-foreground rounded-full shadow-md"
          size={20}
        />
      )}
      {note.image && (
        <Image
          onClick={() => {
            editButton();
          }}
          src={toProxiedImageSrc(note.image)}
          unoptimized
          loading="eager"
          alt="Note Image"
          width={500}
          height={500}
          className={cn(
            "w-full object-cover block",
            "h-40",
            note.image && "rounded-t-xl",
          )}
        />
      )}
      <CardHeader onClick={editButton}>
        <div className="overflow-hidden">
          <CardTitle className="wrap-break-word text-base font-semibold">
            {note.title}
          </CardTitle>
          {note.shared && (
            <span
              title="Shared note"
              className="mt-1 inline-flex text-muted-foreground"
            >
              <Users size={14} aria-label="Shared note" />
            </span>
          )}
        </div>
        <CardContent className="grow-0 overflow-hidden px-4 pb-2 text-sm">
          {/* {note.checklist ? ( */}
          {note.checklist && parsedChecklist.length > 0 ? (
            <div className="space-y-1">
              {parsedChecklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className={`size-4 shrink-0 rounded border-2 flex items-center justify-center ${
                      item.checked
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {item.checked && (
                      <Check
                        size={10}
                        strokeWidth={3}
                        className="text-primary-foreground"
                      />
                    )}
                  </span>
                  <span
                    className={
                      item.checked ? "line-through text-muted-foreground" : ""
                    }
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="whitespace-pre-wrap wrap-break-word"
              dangerouslySetInnerHTML={{
                __html:
                  sanitizeNoteHtml(note.content?.substring(0, 1000)) +
                    `${note.content && note.content.length > 1000 ? "..." : ""}` ||
                  "",
              }}
            />
          )}
        </CardContent>
        {note.labels && note.labels.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {note.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
        {reminderDate && (
          <div className="px-4 pb-2 flex">
            <span
              title={`Reminder: ${reminderDate.toLocaleString()}`}
              className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
            >
              <Bell size={12} aria-label="Reminder" />
              <span className="wrap-break-word">{reminderLabel}</span>
              {!isTrashPath && (
                <button
                  type="button"
                  title="Remove reminder"
                  aria-label="Remove reminder"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    void handleClearReminder();
                  }}
                  className="hover:text-destructive"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          </div>
        )}
      </CardHeader>
      <CardFooter className={"relative min-w-full py-1 z-4"}>
        <Activity mode={showBtns ? "visible" : "hidden"}>
          <div className="absolute">
            <div className="bg-white/50 dark:bg-black/50">
              {!isTrashPath && (
                <>
                  {" "}
                  <DropdownMenu
                    open={showReminder}
                    onOpenChange={(open) => {
                      setShowReminder(open);
                      if (open) setReminderValue(toLocalInput(note.reminderAt));
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(colors)}
                        title={
                          note.reminderAt ? "Edit reminder" : "Add reminder"
                        }
                      >
                        <Bell size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="z-999 p-3 space-y-2"
                    >
                      <div className="text-xs font-semibold text-muted-foreground">
                        Reminder
                      </div>
                      <input
                        type="datetime-local"
                        value={reminderValue}
                        onChange={(e) => setReminderValue(e.target.value)}
                        className="w-full text-sm bg-background border rounded-md px-2 py-1"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          disabled={!reminderValue}
                          onClick={async () => {
                            await updateNote.mutateAsync({
                              id: note.id,
                              reminderAt: new Date(reminderValue),
                            });
                            setShowReminder(false);
                          }}
                        >
                          Save
                        </Button>
                        {note.reminderAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove reminder"
                            onClick={async () => {
                              await handleClearReminder();
                              setShowReminder(false);
                            }}
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu
                    open={showDrpMenu}
                    onOpenChange={setShowDrpMenu}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost">
                        <Palette size={16} className={cn(colors)} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-999">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Background colors
                      </div>
                      <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                        {notesPaletteColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={async () => {
                              await handlePaletteBg(color);
                            }}
                            className={cn(
                              "size-7 rounded-full border border-border flex",
                              "items-center justify-center hover:scale-110 transition-transform",
                            )}
                            style={{
                              backgroundColor: paletteColorValues[color],
                            }}
                            title={color}
                          >
                            {(note.palette as string) === color && (
                              <Check size={14} className="text-foreground" />
                            )}
                          </button>
                        ))}
                        <button
                          onClick={async () => {
                            await handlePaletteBg("");
                          }}
                          className={cn(
                            "size-7 rounded-full border border-border flex",
                            "items-center justify-center hover:scale-110 transition-transform",
                          )}
                          type="button"
                        >
                          <DropletOff size={16} />
                        </button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Background images
                      </div>
                      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                        {backgroundImages.map((img) => (
                          <button
                            key={img}
                            type="button"
                            onClick={async () => {
                              await handlePaletteBg(img);
                            }}
                            className="relative size-14 rounded-md border border-border overflow-hidden hover:scale-105 transition-transform"
                          >
                            <Image
                              fill
                              src={img}
                              alt="palette image"
                              className="size-full object-cover"
                            />
                            {(note.palette as string) === img && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                        <button
                          onClick={async () => {
                            await handlePaletteBg("");
                          }}
                          className="relative size-14 rounded-md border border-border overflow-hidden hover:scale-105 transition-transform"
                          type="button"
                        >
                          <ImageOff color="rgb(70, 68, 68)" size={50} />
                        </button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {icons?.slice(0, 2).map(({ icon, title, onClick }) => (
                <Button
                  key={icon}
                  title={icon === "pin" && isPinned ? "unpin note" : title}
                  className={cn(colors)}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClick(note);
                  }}
                  variant="ghost"
                >
                  <DynamicIcon
                    name={icon === "pin" && isPinned ? "pin-off" : icon}
                    size={16}
                  />
                </Button>
              ))}
              {icons && icons.length > 2 && (
                <DropdownMenu
                  open={showMoreMenu}
                  onOpenChange={setShowMoreMenu}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(colors)}
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-999">
                    {icons.slice(2).map(({ icon, title, onClick }) => (
                      <DropdownMenuItem
                        key={icon}
                        title={
                          icon === "pin" && isPinned ? "unpin note" : title
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onClick(note);
                          setShowMoreMenu(false)
                        }}
                      >
                        <DynamicIcon
                          name={icon === "pin" && isPinned ? "pin-off" : icon}
                          size={16}
                        />
                        <span className="capitalize">{icon}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </Activity>
      </CardFooter>
    </Card>
  );
}
