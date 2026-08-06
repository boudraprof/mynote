import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import type { ChecklistItem } from '@/components/ChecklistEditor'
import { useTheme } from '@/hooks/use-theme'
import { Radius, Spacing } from '@/constants/theme'
import { LabelPicker } from '@/components/LabelPicker'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { PalettePicker } from '@/components/PalettePicker'
import { ImageAttachments } from '@/components/ImageAttachments'
import { DrawingEditor } from '@/components/DrawingEditor'
import { ActionSheet } from '@/components/ActionSheet'
import { Ionicons } from '@expo/vector-icons'
import { config } from '@/lib/env'
import { uploadImage } from '@/api/upload'
import { createLocalNote, updateLocalNote } from '@/lib/offline-notes'
import { useNetwork } from '@/hooks/use-network'
import { useAuth } from '@/providers/auth-provider'
import { syncPendingNotes } from '@/hooks/use-sync'

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

type ActiveSheet = 'add' | 'theme' | null

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
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [drawingVisible, setDrawingVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  )

  useEffect(() => {
    const hasContent =
      title ||
      content ||
      labels.length > 0 ||
      palette ||
      image ||
      checklistItems.length > 0
    if (!hasContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status when note is empty
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const noteData = {
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
        }

        if (noteIdRef.current) {
          await updateLocalNote({ id: noteIdRef.current, ...noteData })
        } else {
          noteIdRef.current = await createLocalNote(noteData)
        }
        setSaveStatus('saved')
        // Push the locally-saved note to the server when online
        if (isOnlineRef.current && userRef.current) {
          syncPendingNotes().catch((e) => console.warn('Auto-sync failed:', e))
        }
      } catch {
        setSaveStatus('idle')
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [title, content, labels, isChecklist, checklistItems, palette, image])

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
      // keyboardVerticalOffset={insets.top}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: containerBg },
          headerTintColor: textColor,
          headerShadowVisible: false,
        }}
      />

      {bgImageUri && (
        <Image
          source={{ uri: bgImageUri }}
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

          <ImageAttachments image={image} onChange={setImage} />

          {!isChecklist && (
            <TextInput
              style={[styles.contentInput, { color: textColor }]}
              placeholder="Note"
              placeholderTextColor={secondaryColor}
              value={content}
              onChangeText={setContent}
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

          <LabelPicker selectedLabels={labels} onChange={setLabels} />
        </ScrollView>

        {/* ── Save status ─────────────────────────────── */}
        {saveStatus !== 'idle' && (
          <View style={styles.saveStatus}>
            {saveStatus === 'saving' ? (
              <ActivityIndicator size="small" color={secondaryColor} />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
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
            onPress={() => {setActiveSheet('add')}}
          >
            <Ionicons name="add-circle-outline" size={22} color={textColor} />
            <Text style={[styles.actionBarLabel, { color: secondaryColor }]}>
              Add
            </Text>
          </Pressable>

          {/* Theme / palette button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBarBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => setActiveSheet('theme')}
          >
            <Ionicons
              name="color-palette-outline"
              size={22}
              color={textColor}
            />
            <Text style={[styles.actionBarLabel, { color: secondaryColor }]}>
              Theme
            </Text>
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
              <Ionicons name="camera-outline" size={22} color={textColor} />
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
              <Ionicons name="image-outline" size={22} color={textColor} />
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
              <Ionicons name="brush-outline" size={22} color={textColor} />
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
              <Ionicons
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
