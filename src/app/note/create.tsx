import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as ImagePicker from 'expo-image-picker'
import { Stack } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { uploadImage } from '@/api/upload'
import { ActionSheet } from '@/components/ActionSheet'
import type { ChecklistItem } from '@/components/ChecklistEditor'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { DrawingEditor } from '@/components/DrawingEditor'
import { ImageAttachments } from '@/components/ImageAttachments'
import { PalettePicker } from '@/components/PalettePicker'
import { ReminderSheet } from '@/components/ReminderSheet'
import { Radius, Spacing } from '@/constants/theme'
import { useNetwork } from '@/hooks/use-network'
import { useNoteHistory } from '@/hooks/use-note-history'
import { syncPendingNotes } from '@/hooks/use-sync'
import { useTheme } from '@/hooks/use-theme'
import { useUndoStack } from '@/hooks/use-undo'
import { createLocalNote, updateLocalNote } from '@/lib/offline-notes'
import { syncReminderNotification } from '@/lib/notifications'
import { useAuth } from '@/providers/auth-provider'
import { MaterialCommunityIcons } from '@expo/vector-icons'

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

const backgroundImages: Record<string, ImageSourcePropType> = {
  celebration_dark_thumb_0715: require('../../../assets/backgrounds/celebration_dark_thumb_0715.png'),
  video_dark_thumb_0615: require('../../../assets/backgrounds/video_dark_thumb_0615.png'),
  travel_dark_thumb_0615: require('../../../assets/backgrounds/travel_dark_thumb_0615.png'),
  places_dark_thumb_0615: require('../../../assets/backgrounds/places_dark_thumb_0615.png'),
  notes_dark_thumb_0715: require('../../../assets/backgrounds/notes_dark_thumb_0715.png'),
  recipe_dark_thumb_0615: require('../../../assets/backgrounds/recipe_dark_thumb_0615.png'),
  music_dark_thumb_0615: require('../../../assets/backgrounds/music_dark_thumb_0615.png'),
  food_dark_thumb_0615: require('../../../assets/backgrounds/food_dark_thumb_0615.png'),
  grocery_dark_thumb_0615: require('../../../assets/backgrounds/grocery_dark_thumb_0615.png'),
}

type ActiveSheet = 'add' | 'theme' | 'history' | 'reminder' | null

export default function CreateNoteScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const isOnline = useNetwork()
  // Latest-value refs so the autosave debounce isn't restarted on
  // connectivity or auth changes.
  const { user } = useAuth()
  const userRef = useRef(user)
  const isOnlineRef = useRef(isOnline)
  useEffect(() => {
    userRef.current = user
  }, [user])
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])
  const noteIdRef = useRef<string | null>(null)
  const lastSavedRef = useRef<string>('')
  const [historyNoteId, setHistoryNoteId] = useState<string | null>(null)
  const history = useNoteHistory(historyNoteId)
  const saveVersionRef = useRef(history.saveVersion)
  useEffect(() => {
    saveVersionRef.current = history.saveVersion
  }, [history.saveVersion])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentEpoch, setContentEpoch] = useState(0)
  const [labels] = useState<string[]>([])
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [isArchived, setIsArchived] = useState(false)
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [drawingVisible, setDrawingVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  )
  // In-memory undo/redo stack for the content editor (works offline).
  const {
    record: recordUndo,
    undo: undoContent,
    redo: redoContent,
  } = useUndoStack('')


  // Shared payload builder for auto-save, undo/redo and history snapshots.
  const buildPayload = useCallback(
    (noteId: string) => ({
      id: noteId,
      title: title || null,
      content: isChecklist ? null : content || null,
      labels: labels.length > 0 ? labels : undefined,
      checklist: isChecklist || undefined,
      checklistItems:
        isChecklist && checklistItems.length > 0
          ? JSON.stringify(checklistItems)
          : undefined,
      palette: palette || null,
      image: image || null,
      pinned: isPinned,
      reminderAt,
      // A reminder owns the note status (server behaviour); archiving only
      // applies while there is no reminder.
      statusName: isArchived && !reminderAt ? 'archived' : undefined,
    }),
    [
      title,
      content,
      labels,
      isChecklist,
      checklistItems,
      palette,
      image,
      isPinned,
      reminderAt,
      isArchived,
    ],
  )

  // Auto-save: debounce editor changes and persist 800ms after the user
  // stops typing. updateLocalNote is local-first, so this also works
  // offline, and each saved change becomes a history snapshot.
  useEffect(() => {
    const hasContent =
      title ||
      content ||
      labels.length > 0 ||
      palette ||
      image ||
      reminderAt ||
      checklistItems.length > 0
    if (!hasContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status when note is empty
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const isNew = !noteIdRef.current
        if (isNew) {
          noteIdRef.current = await createLocalNote(buildPayload(''))
          setHistoryNoteId(noteIdRef.current)
        }
        const payload = buildPayload(noteIdRef.current!)
        await updateLocalNote(payload)
        lastSavedRef.current = JSON.stringify(payload)
        setSaveStatus('saved')
        // Snapshot this version for history (server-first, local fallback).
        void saveVersionRef.current(
          noteIdRef.current!,
          payload,
          isNew ? 'create' : 'update',
        )
        // Push the locally-saved note to the server when online
        if (isOnlineRef.current && userRef.current) {
          syncPendingNotes().catch((e) => console.warn('Auto-sync failed:', e))
        }
      } catch {
        setSaveStatus('idle')
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [
    title,
    content,
    labels,
    isChecklist,
    checklistItems,
    palette,
    image,
    reminderAt,
    buildPayload,
  ])

  // Keep the OS notification in sync with the note's reminder. Runs once the
  // note exists (it's auto-created on first content) and whenever the reminder
  // changes, so a reminder set here still fires while the app is closed.
  const lastReminderSyncRef = useRef('')
  useEffect(() => {
    const noteId = noteIdRef.current
    if (!noteId) return
    const key = `${noteId}:${reminderAt ?? ''}`
    if (key === lastReminderSyncRef.current) return
    lastReminderSyncRef.current = key
    void syncReminderNotification(noteId, title, reminderAt).then((granted) => {
      if (reminderAt && !granted) {
        Alert.alert(
          'Reminder saved',
          'Notifications are disabled for this app. Enable them in your device settings to get reminded.',
        )
      }
    })
  }, [reminderAt, title, historyNoteId])

  // ── Image picking ──────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    setActiveSheet(null)
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to choose images.',
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })
      console.log(result)
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const uploadResult = await uploadImage({
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        })
        if (uploadResult.url) {
          setImage(uploadResult.url)
        } else {
          Alert.alert('Error', uploadResult.errors || 'Upload failed')
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image')
    }
  }, [])

  const takePhoto = useCallback(async () => {
    setActiveSheet(null)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant camera access to take photos.',
        )
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const uploadResult = await uploadImage({
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        })
        if (uploadResult.url) {
          setImage(uploadResult.url)
        } else {
          Alert.alert('Error', uploadResult.errors || 'Upload failed')
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo')
    }
  }, [])

  const toggleChecklist = useCallback(() => {
    setActiveSheet(null)
    setIsChecklist((prev) => !prev)
  }, [])

  const saveDrawing = useCallback(async (uri: string) => {
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
      } else {
        Alert.alert('Error', uploadResult.errors || 'Upload failed')
      }
    } catch {
      Alert.alert('Error', 'Failed to save drawing')
    }
  }, [])

  const handleUndo = useCallback(() => {
    const target = undoContent()
    if (target !== null) {
      setContent(target)
    } else {
      // Nothing to undo — surface the saved version history instead.
      setActiveSheet('history')
    }
  }, [undoContent])

  const handleRedo = useCallback(() => {
    const target = redoContent()
    if (target !== null) setContent(target)
  }, [redoContent])

  const bgName = palette
    ? palette
        .split('/')
        .pop()
        ?.replace(/\.svg$/, '')
    : null
  const isImageBg = bgName ? backgroundImages[bgName] !== undefined : false
  const paletteBg = palette && !isImageBg ? paletteColorValues[palette] : null
  const containerBg = paletteBg || theme.background
  const textColor = paletteBg || isImageBg ? '#1A1A1A' : theme.text
  const secondaryColor = paletteBg || isImageBg ? '#444' : theme.textSecondary

  const bgSource = isImageBg && bgName ? backgroundImages[bgName] : null

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: containerBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // keyboardVerticalOffset={insets.top}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add note',
          headerStyle: { backgroundColor: containerBg },
          headerTintColor: textColor,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                hitSlop={8}
                onPress={() => setIsPinned((prev) => !prev)}
                accessibilityLabel={isPinned ? 'Unpin note' : 'Pin note'}
              >
                <MaterialCommunityIcons
                  name={isPinned ? 'pin' : 'pin-outline'}
                  size={24}
                  color={isPinned ? theme.accent : textColor}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setActiveSheet('reminder')}
                accessibilityLabel={
                  reminderAt ? 'Change reminder' : 'Add reminder'
                }
              >
                <MaterialCommunityIcons
                  name={reminderAt ? 'bell-ring' : 'bell-ring-outline'}
                  size={22}
                  color={reminderAt ? theme.accent : textColor}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setIsArchived((prev) => !prev)}
                accessibilityLabel={isArchived ? 'Unarchive note' : 'Archive note'}
              >
                <MaterialCommunityIcons
                  name={isArchived ? 'archive' : 'archive-outline'}
                  size={22}
                  color={isArchived ? theme.accent : textColor}
                />
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
                setContent(text)
                recordUndo(text)
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

          {image && (
            <ImageAttachments image={image} onChange={setImage} />
          )}

          {/*<LabelPicker selectedLabels={labels} onChange={setLabels} />*/}
        </ScrollView>

        {/* ── Save status ─────────────────────────────── */}
        {saveStatus !== 'idle' && (
          <View style={styles.saveStatus}>
            {saveStatus === 'saving' ? (
              <ActivityIndicator size="small" color={secondaryColor} />
            ) : (
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={16}
                color={theme.success}
              />
            )}
            <Text style={[styles.saveStatusText, { color: secondaryColor }]}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </Text>
          </View>
        )}

        {/* ── Bottom action bar ──────────────────────────── */}
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: containerBg,
              borderTopColor: 'rgba(0,0,0,0.08)',
              paddingBottom: insets.bottom + Spacing.two,
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
              setActiveSheet('add')
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
            onPress={() => setActiveSheet('theme')}
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
        </View>
      </View>

      {/* ── Add content sheet ────────────────────────────── */}
      <ActionSheet
        visible={activeSheet === 'add'}
        onClose={() => {
          setActiveSheet(null)
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
              setActiveSheet(null)
              setDrawingVisible(true)
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
                color={isChecklist ? '#fff' : textColor}
              />
            </View>
            <Text style={[styles.sheetRowLabel, { color: textColor }]}>
              {isChecklist ? 'Switch to text' : 'Checkboxes'}
            </Text>
          </Pressable>
        </View>
      </ActionSheet>

      {/* ── Theme sheet ──────────────────────────────────── */}
      <ActionSheet
        visible={activeSheet === 'theme'}
        onClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: textColor }]}>
            Note theme
          </Text>
          <PalettePicker
            selected={palette}
            onChange={(p) => {
              setPalette(p)
              setActiveSheet(null)
            }}
          />
        </View>
      </ActionSheet>
      {/* ── Reminder sheet ──────────────────────────────── */}
      <ReminderSheet
        visible={activeSheet === 'reminder'}
        onClose={() => setActiveSheet(null)}
        currentReminder={reminderAt}
        onSave={(iso) => {
          setReminderAt(iso)
          setActiveSheet(null)
        }}
      />

      {/* ── Drawing editor ─────────────────────────────── */}
      <DrawingEditor
        visible={drawingVisible}
        onClose={() => setDrawingVisible(false)}
        onSave={saveDrawing}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.three },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: Spacing.two,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 250,
  },

  // ── Action bar (3 buttons) ────────────────────────────
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  actionBarBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    // gap: 2,
  },
  actionBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Save status ─────────────────────────────────────
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.one,
  },
  saveStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Bottom sheet shared ───────────────────────────────
  sheetContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRowLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  sheetBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
})
