import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadImage } from "@/api/upload";
import { ActionSheet } from "@/components/ActionSheet";
import type { ChecklistItem } from "@/components/ChecklistEditor";
import { ChecklistEditor } from "@/components/ChecklistEditor";
import { DrawingEditor } from "@/components/DrawingEditor";
import { HistoryModal } from "@/components/HistoryModal";
import { ImageAttachments } from "@/components/ImageAttachments";
import { LabelPicker } from "@/components/LabelPicker";
import { PalettePicker } from "@/components/PalettePicker";
import { backgroundImages, paletteColorValues } from "@/constants/paletteBg";
import { Radius, Spacing } from "@/constants/theme";
import { useNetwork } from "@/hooks/use-network";
import { useNoteHistory } from "@/hooks/use-note-history";
import { useNote } from "@/hooks/use-notes";
import { syncPendingNotes } from "@/hooks/use-sync";
import { useTheme } from "@/hooks/use-theme";
import { useUndoStack } from "@/hooks/use-undo";
import { htmlToPlainText } from "@/lib/html";
import { updateLocalNote } from "@/lib/offline-notes";
import { useAuth } from "@/providers/auth-provider";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ActiveSheet = "add" | "theme" | "history" | null;

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOnline = useNetwork();
  const { data: note, isLoading } = useNote(id);
  const history = useNoteHistory(id ?? null);
  // Latest-value refs so the autosave debounce isn't restarted on
  // connectivity or auth changes.
  const { user } = useAuth();
  const userRef = useRef(user);
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);
  const noteIdRef = useRef<string | null>(null);
  const seededIdRef = useRef<string | null>(null);
  const originalContentRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [palette, setPalette] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [drawingVisible, setDrawingVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  // In-memory undo/redo stack for the content editor (works offline).
  const {
    record: recordUndo,
    undo: undoContent,
    redo: redoContent,
    reset: resetUndo,
  } = useUndoStack("");

  const parseItems = (raw: string): ChecklistItem[] => {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  // Seed the editor from the fetched note once it arrives. Guarded by the
  // note id so refetches after an auto-save (same id) don't clobber whatever
  // the user is currently typing.
  useEffect(() => {
    if (note && seededIdRef.current !== note.id) {
      seededIdRef.current = note.id;
      noteIdRef.current = note.id;
      setTitle(note.title ?? "");
      // The web app stores rich-text HTML; the mobile editor is plain text,
      // so normalize for editing but remember the original so an untouched
      // save doesn't strip web formatting.
      originalContentRef.current = note.content;
      const plainContent = htmlToPlainText(note.content);
      setContent(plainContent);
      resetUndo(plainContent);
      setLabels(note.labels ?? []);
      setIsChecklist(note.checklist ?? false);
      setChecklistItems(
        note.checklistItems ? parseItems(note.checklistItems) : [],
      );
      setPalette(note.palette);
      setImage(note.image);
      // The freshly seeded state is by definition already saved, so the
      // auto-save effect below won't fire until the user changes something.
      // Field order must match buildPayload() so the keys compare equal.
      lastSavedRef.current = JSON.stringify({
        id: note.id,
        title: note.title ?? "",
        content: note.content,
        labels: note.labels ?? [],
        checklist: note.checklist ?? false,
        checklistItems: note.checklistItems ?? null,
        palette: note.palette,
        image: note.image,
      });
    }
  }, [note, resetUndo]);

  // Shared payload builder for auto-save and history snapshots.
  const buildPayload = useCallback(
    (noteId: string) => ({
      id: noteId,
      title,
      // Preserve the original web rich-text when the editor text hasn't
      // changed, so opening a note doesn't strip web formatting.
      content: isChecklist
        ? null
        : content === htmlToPlainText(originalContentRef.current)
          ? originalContentRef.current
          : content,
      labels,
      checklist: isChecklist,
      checklistItems:
        isChecklist && checklistItems.length > 0
          ? JSON.stringify(checklistItems)
          : null,
      palette,
      image,
    }),
    [title, content, labels, isChecklist, checklistItems, palette, image],
  );

  // Auto-save: debounce editor changes and persist 800ms after the user
  // stops typing. updateLocalNote is local-first, so this also works
  // offline, and each saved change becomes a history snapshot.
  const { saveVersion } = history;
  useEffect(() => {
    if (!noteIdRef.current || !seededIdRef.current) return;
    const payload = buildPayload(noteIdRef.current);
    const key = JSON.stringify(payload);
    if (key === lastSavedRef.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await updateLocalNote(payload);
        lastSavedRef.current = key;
        setSaveStatus("saved");
        // Snapshot this version for history (server-first, local fallback).
        void saveVersion(noteIdRef.current!, payload, "update");
        // Push the locally-saved note to the server when online
        if (isOnlineRef.current && userRef.current) {
          syncPendingNotes().catch((e) => console.warn("Auto-sync failed:", e));
        }
      } catch {
        // Keep the unsaved state; the next keystroke retries.
        setSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    title,
    content,
    labels,
    isChecklist,
    checklistItems,
    palette,
    image,
    buildPayload,
    saveVersion,
  ]);

  // ── Image picking ──────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    setActiveSheet(null);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant media library access to choose images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uploadResult = await uploadImage({
          uri: asset.uri,
          name: asset.fileName || "photo.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        if (uploadResult.url) {
          setImage(uploadResult.url);
        } else {
          Alert.alert("Error", uploadResult.errors || "Upload failed");
        }
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  }, []);

  const takePhoto = useCallback(async () => {
    setActiveSheet(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant camera access to take photos.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uploadResult = await uploadImage({
          uri: asset.uri,
          name: asset.fileName || "photo.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        if (uploadResult.url) {
          setImage(uploadResult.url);
        } else {
          Alert.alert("Error", uploadResult.errors || "Upload failed");
        }
      }
    } catch {
      Alert.alert("Error", "Failed to take photo");
    }
  }, []);

  const toggleChecklist = useCallback(() => {
    setActiveSheet(null);
    setIsChecklist((prev) => !prev);
  }, []);

  const saveDrawing = useCallback(async (uri: string) => {
    try {
      const uploadResult = await uploadImage(
        {
          uri,
          name: `drawing-${Date.now()}.png`,
          type: "image/png",
        },
        "drawings",
      );
      if (uploadResult.url) {
        setImage(uploadResult.url);
      } else {
        Alert.alert("Error", uploadResult.errors || "Upload failed");
      }
    } catch {
      Alert.alert("Error", "Failed to save drawing");
    }
  }, []);

  // Apply a version snapshot back onto the editor. The auto-save effect
  // then persists it, so restored state also lands in the local DB.
  const applySnapshot = useCallback(
    (snapshot: Record<string, unknown>) => {
      if ("title" in snapshot)
        setTitle((snapshot.title as string | null) ?? "");
      if ("content" in snapshot) {
        originalContentRef.current = snapshot.content as string | null;
        const plain = htmlToPlainText(snapshot.content as string | null);
        setContent(plain);
        resetUndo(plain);
      }
      if ("labels" in snapshot) setLabels((snapshot.labels as string[]) ?? []);
      if ("palette" in snapshot)
        setPalette((snapshot.palette as string | null) ?? null);
      if ("image" in snapshot)
        setImage((snapshot.image as string | null) ?? null);
      if ("checklist" in snapshot) setIsChecklist(Boolean(snapshot.checklist));
      if ("checklistItems" in snapshot && snapshot.checklistItems != null) {
        setIsChecklist(true);
        setChecklistItems(parseItems(snapshot.checklistItems as string));
      }
    },
    [resetUndo],
  );

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      const snapshot = await history.restoreVersion(versionId);
      if (!snapshot) {
        Alert.alert("Error", "Failed to restore version");
        return;
      }
      applySnapshot(snapshot);
      setActiveSheet(null);
    },
    [history, applySnapshot],
  );

  const handleUndo = useCallback(() => {
    const target = undoContent();
    if (target !== null) {
      setContent(target);
    } else {
      // Nothing to undo — surface the saved version history instead.
      setActiveSheet("history");
    }
  }, [undoContent]);

  const handleRedo = useCallback(() => {
    const target = redoContent();
    if (target !== null) setContent(target);
  }, [redoContent]);

  // ── Loading / missing states ─────────────────────────
  if (isLoading && !note) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (!note) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
        <Text style={{ color: theme.textSecondary }}>Note not found</Text>
      </View>
    );
  }

  const bgName = palette
    ? palette
        .split("/")
        .pop()
        ?.replace(/\.svg$/, "")
    : null;
  const isImageBg = bgName ? backgroundImages[bgName] !== undefined : false;
  const paletteBg = palette && !isImageBg ? paletteColorValues[palette] : null;
  const containerBg = paletteBg || theme.background;
  const textColor = paletteBg || isImageBg ? "#1A1A1A" : theme.text;
  const secondaryColor = paletteBg || isImageBg ? "#444" : theme.textSecondary;

  const bgSource = isImageBg && bgName ? backgroundImages[bgName] : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: containerBg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // keyboardVerticalOffset={insets.top}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Edit",
          headerStyle: { backgroundColor: containerBg },
          headerTintColor: textColor,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => {}}>
                {/* <MaterialCommunityIcons name="pin-outline" size={22} color={textColor} /> */}
                <MaterialCommunityIcons
                  name="pin"
                  size={24}
                  color={textColor}
                />
              </Pressable>
              <Pressable onPress={() => {}}>
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={22}
                  color={textColor}
                />
              </Pressable>
              <Pressable onPress={() => {}}>
                <MaterialCommunityIcons name="archive-outline" size={22} color={textColor} />
              </Pressable>
            </View>
          ),
        }}
      />

      {bgSource && (
        <Image
          source={bgSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[styles.titleInput, { color: textColor }]}
            placeholder="Title"
            placeholderTextColor={secondaryColor}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
          {!isChecklist && (
            <TextInput
              style={[styles.contentInput, { color: textColor }]}
              placeholder="Note"
              placeholderTextColor={secondaryColor}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                recordUndo(text);
              }}
              multiline
              textAlignVertical="top"
            />
          )}

          {isChecklist && (
            <ChecklistEditor
              items={checklistItems}
              onChange={setChecklistItems}
            />
          )}

          {image && <ImageAttachments image={image} onChange={setImage} />}

          <LabelPicker selectedLabels={labels} onChange={setLabels} />
        </ScrollView>

        {/* ── Save status ─────────────────────────────── */}
        {saveStatus !== "idle" && (
          <View style={styles.saveStatus}>
            {saveStatus === "saving" ? (
              <ActivityIndicator size="small" color={secondaryColor} />
            ) : (
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={16}
                color={theme.success}
              />
            )}
            <Text style={[styles.saveStatusText, { color: secondaryColor }]}>
              {saveStatus === "saving" ? "Saving…" : "Saved"}
            </Text>
          </View>
        )}

        {/* ── Bottom action bar ──────────────────────────── */}
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: containerBg,
              borderTopColor: "rgba(0,0,0,0.08)",
              paddingBottom: insets.bottom + Spacing.two - 10,
            },
          ]}
        >
          {/* Add content button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => {
              setActiveSheet("add");
            }}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={textColor} />
          </Pressable>

          {/* Theme / palette button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => setActiveSheet("theme")}
          >
            <MaterialCommunityIcons
              name="palette-outline"
              size={22}
              color={textColor}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleUndo}
          >
            <MaterialIcons name="undo" size={22} color={textColor} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleRedo}
          >
            <MaterialIcons name="redo" size={22} color={textColor} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              {
                opacity:
                  history.versions.length === 0 ? 0.3 : pressed ? 0.6 : 1,
              },
            ]}
            onPress={() => {
              if (history.versions.length > 0) {
                setActiveSheet("history");
              }
            }}
            disabled={history.versions.length === 0}
          >
            <MaterialIcons name="history" size={22} color={textColor} />
          </Pressable>
        </View>
      </View>

      {/* ── Add content sheet ────────────────────────────── */}
      <ActionSheet
        visible={activeSheet === "add"}
        onClose={() => {
          setActiveSheet(null);
        }}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: textColor }]}>
            Add to note
          </Text>

          <Pressable style={styles.sheetRow} onPress={takePhoto}>
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <MaterialCommunityIcons name="camera-outline" size={22} color={textColor} />
            </View>
            <Text style={[styles.sheetRowLabel, { color: textColor }]}>
              Take photo
            </Text>
          </Pressable>

          <Pressable style={styles.sheetRow} onPress={pickFromGallery}>
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <MaterialCommunityIcons name="image-outline" size={22} color={textColor} />
            </View>
            <Text style={[styles.sheetRowLabel, { color: textColor }]}>
              Add image
            </Text>
          </Pressable>

          <Pressable
            style={styles.sheetRow}
            onPress={() => {
              setActiveSheet(null);
              setDrawingVisible(true);
            }}
          >
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <MaterialCommunityIcons name="brush-outline" size={22} color={textColor} />
            </View>
            <Text style={[styles.sheetRowLabel, { color: textColor }]}>
              Drawing
            </Text>
          </Pressable>

          <Pressable style={styles.sheetRow} onPress={toggleChecklist}>
            <View
              style={[
                styles.sheetIcon,
                {
                  backgroundColor: isChecklist
                    ? theme.accent
                    : theme.backgroundElement,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="checkbox-outline"
                size={22}
                color={isChecklist ? "#fff" : textColor}
              />
            </View>
            <Text style={[styles.sheetRowLabel, { color: textColor }]}>
              {isChecklist ? "Switch to text" : "Checkboxes"}
            </Text>
          </Pressable>
        </View>
      </ActionSheet>

      {/* ── Theme sheet ──────────────────────────────────── */}
      <ActionSheet
        visible={activeSheet === "theme"}
        onClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: textColor }]}>
            Note theme
          </Text>
          <PalettePicker
            selected={palette}
            onChange={(p) => {
              setPalette(p);
              setActiveSheet(null);
            }}
          />
        </View>
      </ActionSheet>

      {/* ── Version history ────────────────────────────── */}
      <HistoryModal
        visible={activeSheet === "history"}
        onClose={() => setActiveSheet(null)}
        isLoading={history.isLoading}
        versions={history.versions}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* ── Drawing editor ─────────────────────────────── */}
      <DrawingEditor
        visible={drawingVisible}
        onClose={() => setDrawingVisible(false)}
        onSave={saveDrawing}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: Spacing.four, gap: Spacing.three },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: Spacing.two,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 250,
  },

  // ── Action bar (3 buttons) ────────────────────────────
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: Spacing.two - 10,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  actionBarBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    // gap: 2,
  },
  actionBarLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  // ── Save status ─────────────────────────────────────
  saveStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.one,
  },
  saveStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Bottom sheet shared ───────────────────────────────
  sheetContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.one,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetRowLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  sheetBadge: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
});
