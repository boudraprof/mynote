import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ChecklistItem } from '@/components/ChecklistEditor'
import { useDeleteNote, useNote, useUpdateNote } from '@/hooks/use-notes'
import { useTheme } from '@/hooks/use-theme'
import { LoadingView } from '@/components/LoadingView'
import { Radius, Spacing } from '@/constants/theme'
import { LabelPicker } from '@/components/LabelPicker'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { PalettePicker } from '@/components/PalettePicker'
import { ImageAttachments } from '@/components/ImageAttachments'
import { DrawingEditor } from '@/components/DrawingEditor'
import { ReminderSheet } from '@/components/ReminderSheet'
import { ShareSheet } from '@/components/ShareSheet'
import { Ionicons } from '@expo/vector-icons'
import { config } from '@/lib/env'
import { htmlToPlainText } from '@/lib/html'
import {
  cancelReminder,
  ensureReminderPermissions,
  scheduleReminder,
} from '@/lib/notifications'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/providers/auth-provider'
import { useNoteHistory } from '@/hooks/use-note-history'

const paletteColorValues: Record<string, string> = {
  coral: '#f4a460',
  peach: '#ffdab9',
  sand: '#f5deb3',
  mint: '#98fb98',
  sage: '#bcb88a',
  fog: '#dcdcdc',
  storm: '#708090',
  dusk: '#b0c4de',
  blossom: '#ffb7c5',
  clay: '#c4a882',
  chalk: '#f5f5dc',
}

const backgroundImages: Record<string, string> = {
  'bg-grid': '/backgrounds/bg-grid.png',
  'bg-dots': '/backgrounds/bg-dots.png',
  'bg-waves': '/backgrounds/bg-waves.png',
  'bg-floral': '/backgrounds/bg-floral.png',
  'bg-geometric': '/backgrounds/bg-geometric.png',
  'bg-marble': '/backgrounds/bg-marble.png',
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data: note, isLoading, error } = useNote(id)
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const { user } = useAuth()
  const history = useNoteHistory(id ?? null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drawingVisible, setDrawingVisible] = useState(false)
  const [reminderVisible, setReminderVisible] = useState(false)
  const [shareVisible, setShareVisible] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(false)
  const originalContentRef = useRef<string | null>(null)

  const parseItems = (raw: string): ChecklistItem[] => {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  useEffect(() => {
    if (note) {
      // Seed the editor from the fetched note once it arrives.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed editor on load
      setTitle(note.title ?? '')
      // The web app stores rich-text HTML; the mobile editor is plain text,
      // so normalize for editing but remember the original so an untouched
      // save doesn't strip web formatting.
      originalContentRef.current = note.content
      setContent(htmlToPlainText(note.content))
      setLabels(note.labels ?? [])
      setIsChecklist(note.checklist ?? false)
      setChecklistItems(
        note.checklistItems ? parseItems(note.checklistItems) : [],
      )
      setPalette(note.palette)
      setImage(note.image)
      setReminderAt(note.reminderAt ?? null)
    }
  }, [note])

  const markDirty = useCallback(() => setDirty(true), [])

  const handleSave = useCallback(async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      // If the user never touched the text, keep the original content
      // (possibly rich-text HTML from the web app) instead of replacing it
      // with the stripped plain-text version.
      const contentToSave =
        content === htmlToPlainText(originalContentRef.current)
          ? originalContentRef.current
          : content
      const payload = {
        id,
        title,
        content: isChecklist ? null : contentToSave,
        labels,
        checklist: isChecklist,
        checklistItems:
          isChecklist && checklistItems.length > 0
            ? JSON.stringify(checklistItems)
            : null,
        palette,
        image,
        reminderAt,
      }
      await updateNote.mutateAsync(payload)
      // Snapshot this version locally for history
      await history.saveVersion(id, payload, 'update')
      setDirty(false)
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }, [
    id,
    title,
    content,
    labels,
    isChecklist,
    checklistItems,
    palette,
    image,
    reminderAt,
    updateNote,
    history,
    saving,
  ])

  const saveDrawing = useCallback(
    async (uri: string) => {
      try {
        const uploadResult = await uploadImage(
          {
            uri,
            name: `drawing-${Date.now()}.png`,
            type: 'image/png',
          },
          'drawings',
        )
        if (uploadResult.url) {
          setImage(uploadResult.url)
          markDirty()
        } else {
          Alert.alert('Error', uploadResult.errors || 'Upload failed')
        }
      } catch {
        Alert.alert('Error', 'Failed to save drawing')
      }
    },
    [markDirty],
  )

  const handleSaveReminder = useCallback(
    async (value: string | null) => {
      if (!id) return
      try {
        await updateNote.mutateAsync({ id, reminderAt: value })
        setReminderAt(value)
        setDirty(false)

        // Keep the OS local notification in sync with the stored reminder.
        if (value) {
          const granted = await ensureReminderPermissions()
          if (granted) {
            await scheduleReminder(id, note?.title, value)
          } else {
            Alert.alert(
              'Reminder saved',
              'Notifications are disabled for this app. Enable them in your device settings to get reminded.',
            )
          }
        } else {
          await cancelReminder(id)
        }
      } catch {
        Alert.alert('Error', 'Failed to update reminder')
      }
    },
    [id, updateNote, note],
  )

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Note', 'Move this note to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateNote.mutateAsync({ id: id, statusName: 'trash' })
            void cancelReminder(id)
            router.back()
          } catch {
            Alert.alert('Error', 'Failed to delete note')
          }
        },
      },
    ])
  }, [id, updateNote])

  const handleArchive = useCallback(async () => {
    if (!id) return
    try {
      await updateNote.mutateAsync({
        id,
        statusName: note?.StatusName === 'archived' ? 'active' : 'archived',
      })
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to archive note')
    }
  }, [id, note, updateNote])

  const handleRestore = useCallback(async () => {
    if (!id) return
    try {
      await updateNote.mutateAsync({ id, statusName: 'active' })
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to restore note')
    }
  }, [id, updateNote])

  const handlePermanentDelete = useCallback(() => {
    Alert.alert('Delete Forever', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote.mutateAsync(id)
            void cancelReminder(id)
            router.back()
          } catch {
            Alert.alert('Error', 'Failed to delete note')
          }
        },
      },
    ])
  }, [id, deleteNote])

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      const snapshot = await history.restoreVersion(versionId)
      if (!snapshot) {
        Alert.alert('Error', 'Failed to restore version')
        return
      }
      if ('title' in snapshot) setTitle((snapshot.title as string | null) ?? '')
      if ('content' in snapshot) {
        originalContentRef.current = snapshot.content as string | null
        setContent(htmlToPlainText(snapshot.content as string | null))
      }
      if ('labels' in snapshot) setLabels((snapshot.labels as string[]) ?? [])
      if ('palette' in snapshot)
        setPalette((snapshot.palette as string | null) ?? null)
      if ('image' in snapshot)
        setImage((snapshot.image as string | null) ?? null)
      if ('checklistItems' in snapshot && snapshot.checklistItems != null) {
        setIsChecklist(true)
        setChecklistItems(parseItems(snapshot.checklistItems as string))
      }
      markDirty()
      setHistoryVisible(false)
    },
    [history, markDirty],
  )

  if (isLoading) {
    return <LoadingView message="Loading note..." />
  }

  if (error || !note) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Note not found</Text>
        <Pressable
          style={({ pressed }) => [
            { opacity: pressed ? 0.6 : 1, marginTop: Spacing.three },
          ]}
          onPress={() => router.back()}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>
            Go back
          </Text>
        </Pressable>
      </View>
    )
  }

  const isTrash = note.StatusName === 'trash'
  const isArchive = note.StatusName === 'archived'
  const isOwner = user?.id === note.userId

  const isImageBg = palette && backgroundImages[palette]
  const paletteBg = palette && !isImageBg ? paletteColorValues[palette] : null
  const containerBg = paletteBg || theme.background
  const textColor = paletteBg || isImageBg ? '#1A1A1A' : theme.text
  const secondaryColor = paletteBg || isImageBg ? '#444' : theme.textSecondary

  const bgImageUri = isImageBg
    ? `${config.apiUrl}${backgroundImages[palette!]}`
    : null

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: containerBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: containerBg },
          headerTintColor: textColor,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (dirty) {
                  Alert.alert('Discard changes?', 'You have unsaved changes', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Discard',
                      style: 'destructive',
                      onPress: () => {
                        router.back()
                      },
                    },
                  ])
                } else {
                  router.back()
                }
              }}
              style={styles.headerBtn}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={20}
                  color={secondaryColor}
                />
                <Text style={[styles.backText, { color: secondaryColor }]}>
                  Edit
                </Text>
              </View>
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {dirty && (
                <Pressable
                  onPress={handleSave}
                  disabled={saving || updateNote.isPending}
                  style={[
                    styles.headerBtn,
                    styles.saveBtn,
                    { backgroundColor: theme.accent },
                  ]}
                >
                  {saving || updateNote.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      {bgImageUri && (
        <Image
          source={{ uri: bgImageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
        keyboardShouldPersistTaps="handled"
      >
        {!isTrash && (
          <ImageAttachments
            image={image}
            onChange={(url) => {
              setImage(url)
              markDirty()
            }}
          />
        )}

        {reminderAt && !isTrash && (
          <Pressable
            style={[styles.reminderBadge, { backgroundColor: 'rgba(0,0,0,0.06)' }]}
            onPress={() => setReminderVisible(true)}
          >
            <Ionicons name="notifications-outline" size={14} color={secondaryColor} />
            <Text style={[styles.reminderBadgeText, { color: secondaryColor }]}>
              {new Date(reminderAt).toLocaleString()}
            </Text>
          </Pressable>
        )}

        <TextInput
          style={[styles.titleInput, { color: textColor }]}
          value={title}
          onChangeText={(v) => {
            setTitle(v)
            markDirty()
          }}
          placeholder="Title"
          placeholderTextColor={secondaryColor}
          editable={!isTrash}
        />

        {!isChecklist && (
          <TextInput
            style={[styles.contentInput, { color: textColor }]}
            value={content}
            onChangeText={(v) => {
              setContent(v)
              markDirty()
            }}
            placeholder="Start writing..."
            placeholderTextColor={secondaryColor}
            multiline
            textAlignVertical="top"
            editable={!isTrash}
          />
        )}

        {isChecklist && (
          <ChecklistEditor
            items={checklistItems}
            onChange={(items) => {
              setChecklistItems(items)
              markDirty()
            }}
          />
        )}

        {!isTrash && (
          <View style={styles.editToolbar}>
            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  opacity: pressed ? 0.7 : 1,
                },
                isChecklist && { backgroundColor: theme.accent },
              ]}
              onPress={() => {
                setIsChecklist(!isChecklist)
                markDirty()
              }}
            >
              <Text
                style={[
                  styles.toolBtnText,
                  { color: isChecklist ? '#fff' : textColor },
                ]}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={14}
                  color={isChecklist ? '#fff' : textColor}
                />{' '}
                Checklist
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => setDrawingVisible(true)}
            >
              <Text style={[styles.toolBtnText, { color: textColor }]}>
                <Ionicons name="brush-outline" size={14} color={textColor} />{' '}
                Drawing
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  opacity: pressed ? 0.7 : 1,
                },
                reminderAt && { backgroundColor: theme.accent },
              ]}
              onPress={() => setReminderVisible(true)}
            >
              <Text
                style={[
                  styles.toolBtnText,
                  { color: reminderAt ? '#fff' : textColor },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={14}
                  color={reminderAt ? '#fff' : textColor}
                />{' '}
                Reminder
              </Text>
            </Pressable>

            {isOwner && (
              <Pressable
                style={({ pressed }) => [
                  styles.toolBtn,
                  {
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => setShareVisible(true)}
              >
                <Text style={[styles.toolBtnText, { color: textColor }]}>
                  <Ionicons name="share-social-outline" size={14} color={textColor} />{' '}
                  Share
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => setHistoryVisible(true)}
            >
              <Text style={[styles.toolBtnText, { color: textColor }]}>
                <Ionicons name="time-outline" size={14} color={textColor} />{' '}
                History
              </Text>
            </Pressable>
          </View>
        )}

        {!isTrash && (
          <>
            <View style={styles.section}>
              <PalettePicker
                selected={palette}
                onChange={(p) => {
                  setPalette(p)
                  markDirty()
                }}
              />
            </View>
            <View style={styles.section}>
              <LabelPicker
                selectedLabels={labels}
                onChange={(l) => {
                  setLabels(l)
                  markDirty()
                }}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Editor Footer Actions */}
      {!isTrash && (
        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: 'rgba(0,0,0,0.08)',
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleArchive}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="archive-outline" size={18} color={textColor} />
              <Text style={[styles.actionBtnText, { color: textColor }]}>
                {isArchive ? 'Unarchive' : 'Archive'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleDelete}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>
                Move to Trash
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {isTrash && (
        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: 'rgba(0,0,0,0.08)',
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleRestore}
          >
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>
              Restore
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handlePermanentDelete}
          >
            <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>
              Delete Forever
            </Text>
          </Pressable>
        </View>
      )}

      <DrawingEditor
        visible={drawingVisible}
        onClose={() => setDrawingVisible(false)}
        onSave={saveDrawing}
      />

      <ReminderSheet
        visible={reminderVisible}
        onClose={() => setReminderVisible(false)}
        currentReminder={reminderAt}
        onSave={handleSaveReminder}
      />

      {isOwner && (
        <ShareSheet
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
          noteId={id}
        />
      )}

      {/* History modal */}
      <Modal
        visible={historyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHistoryVisible(false)}
          />
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              Version history
            </Text>
            {history.isLoading ? (
              <ActivityIndicator
                color={theme.accent}
                style={{ marginVertical: Spacing.four }}
              />
            ) : history.versions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No versions saved yet
              </Text>
            ) : (
              <ScrollView style={styles.historyList}>
                {history.versions.map((v) => (
                  <Pressable
                    key={v.id}
                    style={({ pressed }) => [
                      styles.historyRow,
                      {
                        backgroundColor: theme.backgroundElement,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() =>
                      Alert.alert(
                        'Restore version',
                        'Replace the current note with this version?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Restore',
                            onPress: () =>
                              void handleRestoreVersion(v.id),
                          },
                        ],
                      )
                    }
                  >
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyTime, { color: theme.text }]}>
                        {new Date(v.timestamp).toLocaleString()}
                      </Text>
                      <Text
                        style={[
                          styles.historyType,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {v.changeType === 'create'
                          ? 'Created'
                          : v.changeType === 'delete'
                            ? 'Deleted'
                            : 'Edited'}
                        {v.title ? ` — ${v.title}` : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  saveBtn: { paddingHorizontal: Spacing.three },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  backText: { fontSize: 15, fontWeight: '600' },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
  },
  reminderBadgeText: { fontSize: 12, fontWeight: '600' },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: Spacing.four,
    minHeight: 250,
  },
  editToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBtnText: { fontSize: 13, fontWeight: '600' },
  section: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.four,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { textAlign: 'center', paddingVertical: Spacing.four, fontSize: 14 },
  historyList: {},
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  historyInfo: { flex: 1 },
  historyTime: { fontSize: 14, fontWeight: '600' },
  historyType: { fontSize: 12, marginTop: 2 },
})
