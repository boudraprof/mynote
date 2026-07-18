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
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ChecklistItem } from '@/components/ChecklistEditor'
import { useTheme } from '@/hooks/use-theme'
import { Radius, Spacing } from '@/constants/theme'
import { LabelPicker } from '@/components/LabelPicker'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { PalettePicker } from '@/components/PalettePicker'
import { ImageAttachments } from '@/components/ImageAttachments'
import { Ionicons } from '@expo/vector-icons'
import { config } from '@/lib/env'
import { createLocalNote, updateLocalNote } from '@/lib/offline-notes'

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

export default function CreateNoteScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const noteIdRef = useRef<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [labels, setLabels] = useState<Array<string>>([])
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<Array<ChecklistItem>>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [autoSaved, setAutoSaved] = useState(false)

  useEffect(() => {
    const hasContent = title || content || labels.length > 0 || palette || image || checklistItems.length > 0
    if (!hasContent) return

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
        setAutoSaved(true)
      } catch {}
    }, 800)

    return () => clearTimeout(timer)
  }, [title, content, labels, isChecklist, checklistItems, palette, image])

  const handleSave = useCallback(async () => {
    const hasContent = title || content || labels.length > 0 || palette || image || checklistItems.length > 0
    if (!hasContent) {
      router.back()
      return
    }

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
    } catch {}

    router.back()
  }, [title, content, labels, isChecklist, checklistItems, palette, image])

  const handleDiscard = useCallback(() => {
    if (title || content || labels.length > 0 || image) {
      Alert.alert('Discard note?', 'You have unsaved changes', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ])
    } else {
      router.back()
    }
  }, [title, content, labels, image])

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
              placeholder="Start writing..."
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

          <View style={styles.toolbar}>
            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                {
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  opacity: pressed ? 0.7 : 1,
                },
                isChecklist && { backgroundColor: theme.accent },
              ]}
              onPress={() => setIsChecklist(!isChecklist)}
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

          <PalettePicker selected={palette} onChange={setPalette} />

          <LabelPicker selectedLabels={labels} onChange={setLabels} />
        </ScrollView>

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
            onPress={handleDiscard}
          >
            <Text style={[styles.actionBtnText, { color: secondaryColor }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.saveBtnBottom,
              { opacity: pressed ? 0.6 : 1, backgroundColor: theme.accent },
            ]}
            onPress={handleSave}
          >
            {autoSaved ? (
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Done</Text>
            ) : (
              <ActivityIndicator size="small" color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
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
  toolbar: {
    flexDirection: 'row',
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
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtnBottom: {
    paddingVertical: Spacing.three,
  },
})
