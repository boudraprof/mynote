"use client";

import { toast } from "react-toastify";
import NextImage from "next/image";
import { useAtomValue } from "jotai";
import {
  X,
  Palette,
  Check,
  DropletOff,
  ImageOff,
  Image,
  Type,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Eraser,
  Tag,
  PinOff,
  Pin,
  Bell,
  MoreVertical,
  ListChecks,
  Users,
  Pen,
  Archive,
  ArchiveX,
  Undo,
  Redo,
  History,
  Trash,
  Loader2,
} from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import React, {
  Activity,
  ChangeEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import logger from "@/utils/logger";

import { cn } from "@/utils";
import {
  paletteColorValues,
  notesPaletteColors,
  backgroundImages,
} from "@/utils/bgs-colors";
import { NOTE_STATUS } from "@/utils/status";
import ChecklistEditor, { ChecklistItem } from "../check-list-editor";
import DrawingCanvas from "../drawing-canvas";
import { HistoryDialog } from "../history-dialog";
import { NotesSkeleton } from "../notes-skeleton";
import { RichTextEditor } from "../rich-text-editor";
import { ShareDialog } from "../ShareDialog";
import ToastButton from "../toast-button";
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "../ui/card";
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { useInfiniteNotes, useOptimisticNotes } from "@/hooks";
import { NoteFormData, Notes, NotesInsert } from "@/types";
import api from "@/utils/axios";
import { toLocalInput } from "@/utils/date";
import { saveNoteVersion } from "@/utils/note-history";
import { getNoteStatusForSave } from "@/utils/note-status";
import { labelsKeys, notesKeys } from "@/utils/query-keys";
import { spinner } from "@/utils/atoms";
import Render from "@/components/main-render";

// Layered UI rendered outside #note-creator must not be treated as an
// outside click. Radix Menu/DropdownMenu renders [data-radix-menu-content],
// Radix Popper-based primitives render [data-radix-popper-content-wrapper],
// and our Dialog/overlay components render [data-slot="dialog-content"].
const OUTSIDE_CLICK_EXEMPT_SELECTOR = [
  "[data-radix-menu-content]",
  "[data-radix-popper-content-wrapper]",
  '[data-slot="dialog-content"]',
].join(", ");

export default function NotesPage({
  label,
  initialNotes,
  token,
}: {
  label?: string;
  token?: string;
  initialNotes: Notes;
}) {
  const queryClient = useQueryClient();
  const isSearching = useAtomValue(spinner);

  const {
    data: paginatedData,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useInfiniteNotes(initialNotes, {
    field: label ? undefined : "active",
    label,
  });

  const {
    updateNote,
    togglePin,
    copyNote,
    restoreNote,
    moveToTrash: optimisticTrash,
    moveToArchive: optimisticArchive,
  } = useOptimisticNotes();

  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(
    null,
  );

  const uploadImage = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
        onUploadProgress: (e) => {
          if (e.total) {
            setImageUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      }),
  });

  const initialData: NoteFormData = {
    id: "",
    userId: "",
    statusId: "",
    title: "",
    palette: null,
    content: "",
    pinned: false,
    labels: [],
    statusName: NOTE_STATUS.ACTIVE,
  };
  const [form, setForm] = useState<NoteFormData>(initialData);
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false);
  const noteCreatorRef = useRef<HTMLDivElement>(null);
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Array<ChecklistItem>>([
    { text: "", checked: false },
  ]);
  const [showDrawing, setShowDrawing] = useState(false);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [reminderInput, setReminderInput] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNoteId, setShareNoteId] = useState("");
  const router = useRouter();
  const labelsQuery = useQuery({
    queryKey: labelsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<{ id: string; name: string }>;
      }>("/labels");
      return data.data;
    },
    enabled: isAddingLabel,
  });
  const existingLabels = labelsQuery.data ?? [];
  const isPinned = form.pinned === true;
  const [history, setHistory] = useState<Array<string>>([form.content || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const historyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [verifyEmailMessage, setVerifyEmailMessage] = useState<{
    success?: string;
    error?: string;
  }>({ success: "", error: "" });

  useEffect(() => {
    historyIndexRef.current = historyIndex;
    return () => clearTimeout(historyTimer.current);
  }, [historyIndex]);

  useEffect(() => {
    if (token && token.length > 20) {
      api
        .get(`/verify-email?token=${token}`)
        .then(() => {
          setVerifyEmailMessage({ success: "Your email verified" });
          void router.refresh();
        })
        .catch(() => {
          setVerifyEmailMessage({ error: "Failed to verify email" });
        });
    }
  }, [token]);

  const editButton = (note: NotesInsert) => {
    setForm(note);
    setReminderInput(toLocalInput(note.reminderAt));
    setIsCreatingNote(true);
    noteCreatorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const isCheck = note.checklist === true;
    setIsChecklist(isCheck);
    if (isCheck && note.checklistItems) {
      try {
        setChecklistItems(JSON.parse(note.checklistItems));
      } catch {
        setChecklistItems([{ text: "", checked: false }]);
      }
    } else {
      setChecklistItems([{ text: "", checked: false }]);
    }
  };

  const prevFormRef = useRef<NoteFormData | null>(null);
  const lastSavedIdRef = useRef<string | null>(null);
  const isClosingRef = useRef(false);
  const cleanInput = (form.content ?? "").replaceAll("&nbsp;", " ");
  const saveNote = async () => {
    setHistory([form.content || ""]);
    setHistoryIndex(0);
    const data = {
      ...form,
      checklist: isChecklist || undefined,
      // The status travels by name: turning a name into a status id needs the
      // database, and this module runs in the browser. `statusId` is dropped so
      // the server never has to choose between a stale id and the new name.
      statusId: undefined,
      statusName: getNoteStatusForSave(form.statusName),
      checklistItems: isChecklist
        ? JSON.stringify(checklistItems.filter((i) => i.text.trim()))
        : undefined,
    };
    if (form.id) {
      prevFormRef.current = { ...form };
      try {
        // Optimistic mutation — the cached list updates immediately and the
        // query is invalidated on settle.
        await updateNote.mutateAsync({ ...data, id: form.id });
        lastSavedIdRef.current = form.id;
        // Record a server-backed snapshot so history follows the note
        // across devices (web + mobile).
        await saveNoteVersion({ ...data, id: form.id }, "update");
        return true;
      } catch (error) {
        // updateNote's onError already shows the failure toast.
        logger.error("Failed to save note", error, "Notes");
        return false;
      }
    } else {
      prevFormRef.current = null;
      try {
        const { data: res } = await api.post("/notes", data);
        lastSavedIdRef.current = res.id;
        await saveNoteVersion({ ...data, id: res.id }, "create");
        // Reveal the newly created note in the active list.
        await queryClient.invalidateQueries({ queryKey: notesKeys.all });
        return true;
      } catch (error) {
        toast("Failed to save note.");
        logger.error("Failed to save note", error, "Notes");
        return false;
      }
    }
  };

  const handleContentChange = (html: string) => {
    if (form.content !== html) {
      setForm({ ...form, content: html });
    }

    clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      setHistory((prev) => {
        const idx = historyIndexRef.current;
        const lastSnapshot = prev[idx] || "";
        if (lastSnapshot === html) return prev;
        const trimmed = prev.slice(0, idx + 1);
        trimmed.push(html);
        return trimmed;
      });
      setHistoryIndex((prev) => {
        const next = prev + 1;
        historyIndexRef.current = next;
        return next;
      });
    }, 500);
  };

  const handleChecklistChange = (items: Array<ChecklistItem>) => {
    if (JSON.stringify(checklistItems) !== JSON.stringify(items)) {
      setChecklistItems(items);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, title: e.target.value });
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleCreateNoteToggle = () => {
    setIsCreatingNote(true);
  };

  const handleClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    try {
      if (
        (form.title ?? "").trim().length > 0 ||
        cleanInput.trim().length > 0 ||
        form.image ||
        (isChecklist && checklistItems.some((i) => i.text.trim()))
      ) {
        if (!(await saveNote())) return;
      } else if ((form.title ?? "").length > 0 || cleanInput.length > 0) {
        toast.error("Empty note discarded");
      }

      window.localStorage.removeItem("note");
      setForm(initialData);
      setReminderInput("");
      setIsCreatingNote(false);
      setIsChecklist(false);
      setChecklistItems([{ text: "", checked: false }]);
      setIsAddingLabel(false);
    } finally {
      isClosingRef.current = false;
    }
  }, [form, cleanInput, isChecklist, checklistItems, saveNote]);

  useEffect(() => {
    if (!isCreatingNote) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        noteCreatorRef.current?.contains(target) ||
        target.closest(OUTSIDE_CLICK_EXEMPT_SELECTOR)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void handleClose();
    };

    document.addEventListener("click", closeOnOutsideClick, true);
    return () =>
      document.removeEventListener("click", closeOnOutsideClick, true);
  }, [isCreatingNote, handleClose]);

  const fileRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "notes");
    setImageUploadProgress(0);
    try {
      const { data: r } = await uploadImage.mutateAsync(formData);
      setForm((prev) => ({ ...prev, image: r.url }));
    } catch {
      toast("Failed to upload image.");
    } finally {
      setImageUploadProgress(null);
    }
    e.target.value = "";
  };

  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    if (isSearching) setIsCreatingNote(false);
  }, [isSearching]);

  useEffect(() => {
    if (!hasLoadedDraft.current) {
      hasLoadedDraft.current = true;
      const draft = localStorage.getItem("note");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setIsCreatingNote(true);
          setForm((prev: NoteFormData) => ({ ...prev, ...parsed }));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    if (
      hasLoadedDraft.current &&
      (cleanInput.trim().length > 0 || (form.title ?? "").trim() || form.image)
    ) {
      localStorage.setItem("note", JSON.stringify(form));
    }
  }, [form.title, form.content, form.image]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (typing) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleCreateNoteToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCreateNoteToggle]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden || isCreatingNote) return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }
      const y = window.scrollY;
      void queryClient.invalidateQueries({ queryKey: notesKeys.all });
      window.scrollTo({ top: y });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [queryClient, isCreatingNote]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setForm((prev: NoteFormData) => ({
        ...prev,
        content: history[newIndex],
      }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setForm((prev: NoteFormData) => ({
        ...prev,
        content: history[newIndex],
      }));
    }
  };

  const handleRestoreSnapshot = useCallback(
    (snapshot: Record<string, unknown>) => {
      const next: NoteFormData = { ...form };
      if ("title" in snapshot) {
        next.title = (snapshot.title as string | null) ?? null;
      }
      if ("content" in snapshot) {
        next.content = (snapshot.content as string | null) ?? "";
      }
      if ("image" in snapshot) {
        next.image = (snapshot.image as string | null) ?? null;
      }
      if ("palette" in snapshot) {
        next.palette = (snapshot.palette as string | null) ?? null;
      }
      if ("pinned" in snapshot) {
        next.pinned = snapshot.pinned === true;
      }
      if ("labels" in snapshot) {
        next.labels = (snapshot.labels as Array<string> | null) ?? [];
      }
      if ("reminderAt" in snapshot) {
        const raw = snapshot.reminderAt as string | Date | null | undefined;
        next.reminderAt = raw ? new Date(raw) : null;
      }
      if (snapshot.checklistItems != null) {
        setIsChecklist(true);
        try {
          setChecklistItems(
            JSON.parse(
              snapshot.checklistItems as string,
            ) as Array<ChecklistItem>,
          );
        } catch {
          setChecklistItems([{ text: "", checked: false }]);
        }
      }
      setForm(next);
      setReminderInput(toLocalInput(next.reminderAt));
      toast.success("Note restored to this version");
    },
    [form],
  );

  const labels = form.labels ?? [];

  const addLabel = useCallback(
    (l: string) => {
      const trimmed = l.trim();
      if (!trimmed || labels.includes(trimmed)) return;
      setForm({ ...form, labels: [...labels, trimmed] });
    },
    [form, labels],
  );

  const removeLabel = useCallback(
    (lab: string) => {
      setForm({ ...form, labels: labels.filter((l: string) => l !== lab) });
    },
    [form, labels],
  );

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addLabel(labelInput);
        setLabelInput("");
      }
    },
    [labelInput, addLabel],
  );

  const handlePaletteBg = (bg: string) => {
    const current = form.palette as string;
    setForm({
      ...form,
      palette: current === bg ? null : bg,
    });
  };

  const handleDrawingSave = useCallback(async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("image", blob, "drawing.png");
      fd.append("type", "drawings");
      setImageUploadProgress(0);
      const { data: r } = await uploadImage.mutateAsync(fd);
      setForm((prev: NoteFormData) => ({ ...prev, image: r.url }));
    } catch {
      toast("Failed to upload drawing.");
    } finally {
      setImageUploadProgress(null);
    }
    setShowDrawing(false);
  }, []);

  const isColor = form.palette
    ? notesPaletteColors.includes(form.palette)
    : false;
  // const isBgI = backgroundImages.includes(form.pallette)

  const colors = isColor && "text-black!";
  const cls = cn(form.palette && colors);
  const mess = verifyEmailMessage.error || verifyEmailMessage.success;
  return (
    <>
      {mess && (
        <div
          className={cn(
            verifyEmailMessage.error ? "bg-red-800" : "bg-green-800",
            "flex justify-center items-center  h-15 rounded-md",
          )}
        >
          <h1 className="text-white text-2xl">{mess}</h1>
        </div>
      )}
      {showDrawing && (
        <DrawingCanvas
          onSave={handleDrawingSave}
          onClose={() => setShowDrawing(false)}
        />
      )}
      <div
        id="note-creator"
        ref={noteCreatorRef}
        className="relative z-10  max-w-xl mx-auto my-4 md:my-6"
      >
        {isCreatingNote ? (
          <Card
            style={{
              backgroundImage: `url(${form.palette})`,
              backgroundColor: paletteColorValues[form.palette as string],
            }}
            className={cn(
               form.image? "pt-0!" : "py-5",
              "shadow-xl border-accent-foreground/30 bg-background overflow-hidden",
              colors,
            )}
          >
            {form.image && (
              <div className="relative">
                <NextImage
                  src={form.image}
                  width={500}
                  height={500}
                  alt="Notes Image"
                  className="w-full rounded-t-xl h-90 object-cover  block"
                />
                <Button
                  className="absolute bottom-5 right-5"
                  variant={"secondary"}
                  title="Remove image"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, image: null }));
                  }}
                >
                  <Trash size={16} className="text-red-600" />
                </Button>
              </div>
            )}
            {imageUploadProgress !== null && (
              <div className="flex items-center gap-2 px-4 py-2">
                <Loader2 size={16} className="animate-spin" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${imageUploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {imageUploadProgress}%
                </span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <CardHeader>
                <Input
                  placeholder="Title"
                  value={form.title as string}
                  onChange={onInputChange}
                  className={cn(
                    "bg-transparent! border-0",
                    "text-foreground/90",
                    "text-lg p-0! font-semibold border-0 focus-visible:ring-0 shadow-none",
                    colors,
                  )}
                  aria-label="New note title"
                />
              </CardHeader>
              <CardContent>
                {isChecklist ? (
                  <ChecklistEditor
                    items={checklistItems}
                    onChange={handleChecklistChange}
                  />
                ) : (
                  <RichTextEditor
                    key={form.id || "new"}
                    value={form.content as string}
                    onChange={handleContentChange}
                    aria-label="New note title"
                    placeholder="Take a note..."
                    className={cn(
                      "bg-transparent! border-0",
                      "text-foreground/90",
                      colors,
                      "resize-none  focus-visible:ring-0 shadow-none text-sm min-h-10 outline-none",
                    )}
                  />
                )}
              </CardContent>
              {isAddingLabel && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {labels.map((l: string) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => removeLabel(l)}
                          className="hover:text-destructive"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={handleLabelKeyDown}
                    placeholder="Type label and press Enter"
                    className="h-8 text-xs bg-background/0! border-0 focus-visible:ring-0 shadow-none"
                  />
                  {existingLabels.filter(
                    (l) =>
                      !labels.includes(l.name) &&
                      l.name.toLowerCase().includes(labelInput.toLowerCase()),
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {existingLabels
                        .filter(
                          (l) =>
                            !labels.includes(l.name) &&
                            l.name
                              .toLowerCase()
                              .includes(labelInput.toLowerCase()),
                        )
                        .map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              addLabel(l.name);
                              setLabelInput("");
                            }}
                            className="inline-flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs hover:bg-secondary hover:text-secondary-foreground transition-colors"
                          >
                            {l.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {/* <CardFooter className="flex justify-between h-10 gap-3 text-foreground"> */}

              <CardFooter className="flex justify-between gap-1 ">
                <div className="flex flex-row gap-1">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cls} title="Palette">
                        <Palette size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="z-999">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Background colors
                      </div>
                      <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                        {notesPaletteColors.map((color: string) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              handlePaletteBg(color);
                            }}
                            className="size-7 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform"
                            style={{
                              backgroundColor: paletteColorValues[color],
                            }}
                            title={color}
                          >
                            {(form.palette as string) === color && (
                              <Check size={14} className="text-foreground" />
                            )}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            handlePaletteBg("");
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
                        {backgroundImages.map((img: string) => (
                          <button
                            key={img}
                            type="button"
                            onClick={() => {
                              handlePaletteBg(img);
                            }}
                            className="relative size-14 rounded-md border border-border overflow-hidden hover:scale-105 transition-transform"
                          >
                            <NextImage
                              src={img}
                              alt="Note Image"
                              width={500}
                              height={500}
                              className="w-full h-full object-cover"
                            />
                            {(form.palette as string) === img && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            handlePaletteBg("");
                          }}
                          className="relative size-14 rounded-md border border-border overflow-hidden hover:scale-105 transition-transform"
                          type="button"
                        >
                          <ImageOff color="rgb(70, 68, 68)" size={50} />
                        </button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cls}
                        title="Format text"
                      >
                        <Type size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="z-999">
                      <DropdownMenuItem onClick={() => handleFormat("bold")}>
                        <Bold size={16} />
                        <span>Bold</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFormat("italic")}>
                        <Italic size={16} />
                        <span>Italic</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFormat("strikeThrough")}
                      >
                        <Strikethrough size={16} />
                        <span>Strikethrough</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleFormat("formatBlock", "h1")}
                      >
                        <Heading1 size={16} />
                        <span>Heading 1</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFormat("formatBlock", "h2")}
                      >
                        <Heading2 size={16} />
                        <span>Heading 2</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleFormat("insertUnorderedList")}
                      >
                        <List size={16} />
                        <span>Bullet list</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFormat("insertOrderedList")}
                      >
                        <ListOrdered size={16} />
                        <span>Numbered list</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          handleFormat("formatBlock", "blockquote")
                        }
                      >
                        <Quote size={16} />
                        <span>Quote</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFormat("removeFormat")}
                      >
                        <Eraser size={16} />
                        <span>Clear formatting</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      fileRef.current?.click();
                    }}
                    variant="ghost"
                    className={cls}
                  >
                    <Image size={16} />
                  </Button>

                  <Button
                    variant="ghost"
                    className={cls}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsAddingLabel(!isAddingLabel);
                    }}
                    title={isAddingLabel ? "Done labels" : "Add labels"}
                  >
                    <Tag size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    className={cls}
                    onClick={(e) => {
                      e.preventDefault();
                      setForm({ ...form, pinned: !isPinned });
                    }}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </Button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cls}
                        title={
                          form.reminderAt ? "Edit reminder" : "Add reminder"
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
                      <Input
                        type="datetime-local"
                        value={reminderInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReminderInput(v);
                          setForm({
                            ...form,
                            reminderAt: v ? new Date(v) : null,
                          });
                        }}
                        className="w-full text-sm bg-background border rounded-md px-2 py-1"
                      />
                      {form.reminderAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setReminderInput("");
                            setForm({ ...form, reminderAt: null });
                          }}
                        >
                          Clear reminder
                        </Button>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cls}
                        title="More options"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="z-999">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setIsChecklist(!isChecklist);
                        }}
                      >
                        <ListChecks size={16} />
                        <span>{isChecklist ? "Text mode" : "Checklist"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!form.id}
                        onClick={(e) => {
                          e.preventDefault();
                          if (form.id) setHistoryOpen(true);
                        }}
                      >
                        <History size={16} />
                        <span>Version history</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!form.id}
                        onClick={(e) => {
                          e.preventDefault();
                          if (form.id) {
                            setShareNoteId(form.id);
                            setShareOpen(true);
                          }
                        }}
                      >
                        <Users size={16} />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setShowDrawing(true);
                        }}
                      >
                        <Pen size={16} />
                        <span>Drawing</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          const nextStatusName =
                            form.statusName === NOTE_STATUS.ARCHIVED
                              ? NOTE_STATUS.ACTIVE
                              : NOTE_STATUS.ARCHIVED;

                          setForm((prev) => ({
                            ...prev,
                            statusName: nextStatusName,
                          }));
                          toast.success(
                            nextStatusName === NOTE_STATUS.ARCHIVED
                              ? "The note was added to archive"
                              : "The note was removed from archive",
                          );
                        }}
                      >
                        {form.statusName === NOTE_STATUS.ARCHIVED ? (
                          <ArchiveX size={16} />
                        ) : (
                          <Archive size={16} />
                        )}
                        <span>
                          {form.statusName === NOTE_STATUS.ARCHIVED
                            ? "Unarchive"
                            : "Archive"}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    className={cls}
                    disabled={historyIndex <= 0}
                    onClick={handleUndo}
                    variant="ghost"
                    title="Undo"
                  >
                    <Undo size={16} />
                  </Button>
                  <Button
                    className={cls}
                    disabled={historyIndex >= history.length - 1}
                    onClick={handleRedo}
                    variant="ghost"
                    title="Redo"
                  >
                    <Redo size={16} />
                  </Button>
                  <Input
                    ref={fileRef}
                    onChange={handleFileChange}
                    type="file"
                    className="hidden"
                  />
                </div>
                <Button onClick={handleClose} variant="ghost">
                  Close
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <div
            className="p-3 rounded-lg shadow-md border bg-background hover:shadow-lg transition-shadow cursor-text text-muted-foreground h-12 flex items-center"
            onClick={handleCreateNoteToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCreateNoteToggle();
            }}
            tabIndex={0}
            role="button"
            aria-label="Create a new note"
          >
            Take a note...
          </div>
        )}
      </div>

      <Render
        notes={{ ...initialNotes, data: paginatedData, total }}
        icons={[
          {
            title: "share note",
            icon: "share",
            onClick: (note) => {
              setShareNoteId(note.id);
              setShareOpen(true);
            },
          },
          {
            title: "pin note",
            icon: "pin",
            onClick: (note) => {
              // Use optimistic update for instant UI feedback
              togglePin.mutate({ id: note.id, pinned: !note.pinned });
            },
          },
          {
            title: "copy note",
            icon: "copy",
            onClick: (note) => {
              copyNote.mutate(note, {
                onSuccess: () => toast("Note copied successfully!"),
              });
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
                        // Restore by moving back to active
                        restoreNote.mutate(note);
                        toast.success("Note restored!");
                      }}
                    />,
                    {
                      toastId: "move-to-trash",
                      autoClose: 5000,
                      closeOnClick: false,
                    },
                  );
                },
              });
            },
          },
          {
            title: "move note to archive",
            icon: "archive",
            onClick: (note) => {
              // Optimistic update - UI updates immediately
              optimisticArchive.mutate(note, {
                onSuccess: () => {
                  toast.success(
                    <ToastButton
                      title="Note archived!"
                      onClick={() => {
                        // Restore by moving back to active
                        restoreNote.mutate(note);
                        toast.success("Note restored!");
                      }}
                    />,
                    {
                      toastId: "move-to-archive",
                      autoClose: 5000,
                      closeOnClick: false,
                    },
                  );
                },
              });
            },
          },
        ]}
        editButton={editButton}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />
      <ShareDialog
        noteId={shareNoteId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      <HistoryDialog
        noteId={form.id || null}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestore={handleRestoreSnapshot}
      />
    </>
  );
}
