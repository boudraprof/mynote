import { useCallback, useEffect, useState } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { config } from '@/lib/env'

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

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [labels, setLabels] = useState<Array<string>>([])
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<Array<ChecklistItem>>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? '')
      setContent(note.content ?? '')
      setLabels(note.labels ?? [])
      setIsChecklist(note.checklist ?? false)
      setChecklistItems(
        note.checklistItems ? parseItems(note.checklistItems) : [],
      )
      setPalette(note.palette)
      setImage(note.image)
    }
  }, [note])

  const parseItems = (raw: string): Array<ChecklistItem> => {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  const markDirty = useCallback(() => setDirty(true), [])

  const handleSave = useCallback(async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      await updateNote.mutateAsync({
        id,
        title,
        content: isChecklist ? null : content,
        labels,
        checklist: isChecklist,
        checklistItems:
          isChecklist && checklistItems.length > 0
            ? JSON.stringify(checklistItems)
            : null,
        palette,
        image,
      })
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
    updateNote,
    saving,
  ])

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Note', 'Move this note to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateNote.mutateAsync({ id: id, statusName: 'trash' })
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

  const handlePin = useCallback(async () => {
    if (!id) return
    try {
      await updateNote.mutateAsync({ id, pinned: !note?.pinned })
      setDirty(false)
    } catch {
      Alert.alert('Error', 'Failed to update note')
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
            router.back()
          } catch {
            Alert.alert('Error', 'Failed to delete note')
          }
        },
      },
    ])
  }, [id, deleteNote])

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

  const isImageBg = palette && backgroundImages[palette]
  const paletteBg = palette && !isImageBg ? paletteColorValues[palette] : null
  const containerBg = paletteBg || theme.background
  const textColor = (paletteBg || isImageBg) ? '#1A1A1A' : theme.text
  const secondaryColor = (paletteBg || isImageBg) ? '#444' : theme.textSecondary

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
                      onPress: () => router.back(),
                    },
                  ])
                } else {
                  router.back()
                }
              }}
              style={styles.headerBtn}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="arrow-back-outline" size={20} color={secondaryColor} />
                <Text style={[styles.backText, { color: secondaryColor }]}>Back</Text>
              </View>
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {!isTrash && (
                <Pressable
                  onPress={handlePin}
                  style={styles.headerBtn}
                >
                  <Ionicons name="pin-outline" size={22} color={note.pinned ? textColor : secondaryColor} />
                </Pressable>
              )}
              {dirty && (
                <Pressable
                  onPress={handleSave}
                  disabled={saving || updateNote.isPending}
                  style={[styles.headerBtn, styles.saveBtn, { backgroundColor: theme.accent }]}
                >
                  {saving || updateNote.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>
                      Save
                    </Text>
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
        <ImageAttachments
          image={image}
          onChange={(url) => {
            setImage(url)
            markDirty()
          }}
        />

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
                <Ionicons name="checkbox-outline" size={14} color={isChecklist ? '#fff' : textColor} /> Checklist
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: { paddingHorizontal: Spacing.two, paddingVertical: 6, borderRadius: Radius.sm },
  saveBtn: { paddingHorizontal: Spacing.three },
  headerActions: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  backText: { fontSize: 15, fontWeight: '600' },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
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
})
