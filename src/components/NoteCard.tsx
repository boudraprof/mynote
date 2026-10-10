import type { ApiNote } from '@/api/types'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { useImageSource } from '@/hooks/use-image-source'
import { useTheme } from '@/hooks/use-theme'
import { htmlToPlainText } from '@/lib/html'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image as ExpoImage } from 'expo-image'
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

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
  celebration_dark_thumb_0715: require('../../assets/backgrounds/celebration_dark_thumb_0715.png'),
  video_dark_thumb_0615: require('../../assets/backgrounds/video_dark_thumb_0615.png'),
  travel_dark_thumb_0615: require('../../assets/backgrounds/travel_dark_thumb_0615.png'),
  places_dark_thumb_0615: require('../../assets/backgrounds/places_dark_thumb_0615.png'),
  notes_dark_thumb_0715: require('../../assets/backgrounds/notes_dark_thumb_0715.png'),
  recipe_dark_thumb_0615: require('../../assets/backgrounds/recipe_dark_thumb_0615.png'),
  music_dark_thumb_0615: require('../../assets/backgrounds/music_dark_thumb_0615.png'),
  food_dark_thumb_0615: require('../../assets/backgrounds/food_dark_thumb_0615.png'),
  grocery_dark_thumb_0615: require('../../assets/backgrounds/grocery_dark_thumb_0615.png'),
}

interface NoteCardProps {
  note: ApiNote
  onPress: () => void
  onLongPress?: () => void
  selected?: boolean
}

export function NoteCard({
  note,
  onPress,
  onLongPress,
  selected = false,
}: NoteCardProps) {
  const theme = useTheme()

  const bgName = note.palette
    ? note.palette.split('/').pop()?.replace(/\.svg$/, '')
    : null
  const isImageBg = bgName ? backgroundImages[bgName] !== undefined : false
  const paletteBg =
    note.palette && !isImageBg ? paletteColorValues[note.palette] : null
  const cardBg = paletteBg || theme.surface
  const effectiveBg =
    selected && !paletteBg && !isImageBg ? theme.accentLight : cardBg
  const borderColor = selected ? theme.accent : theme.border
  const textColor = paletteBg || isImageBg ? '#1A1A1A' : theme.text
  const secondaryColor = paletteBg || isImageBg ? '#444' : theme.textSecondary

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    // Clamp so a slightly-future timestamp (e.g. server clock ahead of the
    // device) renders as "today" instead of a negative "-1d ago".
    const diffMs = Math.max(0, now.getTime() - d.getTime())
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const formatReminder = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const time = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    if (d.toDateString() === now.toDateString()) return `Today, ${time}`
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const parseChecklistItems = (
    raw: string | null,
  ): { text: string; checked: boolean }[] => {
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  const checklistItems = note.checklist
    ? parseChecklistItems(note.checklistItems)
    : []
  const checkedCount = checklistItems.filter((i) => i.checked).length

  const imageSource = useImageSource(note.image)

  const bgSource = isImageBg && bgName ? backgroundImages[bgName] : null

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: effectiveBg, opacity: pressed ? 0.88 : 1 },
        !paletteBg && !isImageBg && Shadow.sm,
        { borderColor },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {bgSource && (
        <Image
          source={bgSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {selected && (
        <View style={[styles.selectedBadge, { backgroundColor: theme.accent }]}> 
          <MaterialCommunityIcons name="check" size={12} color={theme.onAccent} />
        </View>
      )}

      {imageSource && (
        <ExpoImage
          source={imageSource}
          style={[styles.cardImage, {height: imageSource&& 300}]}
          contentFit="cover"
        />
      )}

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {note.title || 'Untitled'}
        </Text>
        {note.pinned && !selected && (
          <View
            style={[styles.pinBadge, { backgroundColor: 'rgba(0,0,0,0.07)' }]}
          >
            <MaterialCommunityIcons name="pin-outline" size={10} color="#1A1A1A" />
          </View>
        )}
      </View>

      {note.checklist ? (
        <View style={styles.checklistPreview}>
          {checklistItems.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.checklistRow}>
              <View
                style={[
                  styles.checkboxCircle,
                  { borderColor: secondaryColor },
                  item.checked && { backgroundColor: secondaryColor },
                ]}
              >
                {item.checked && <MaterialCommunityIcons name="check-outline" size={8} color="#fff" />}
              </View>
              <Text
                style={[
                  styles.checklistText,
                  {
                    color: secondaryColor,
                    textDecorationLine: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.5 : 1,
                  },
                ]}
                numberOfLines={1}
              >
                {item.text || 'Empty item'}
              </Text>
            </View>
          ))}
          {checklistItems.length > 3 && (
            <Text style={[styles.moreText, { color: secondaryColor }]}>
              +{checklistItems.length - 3} more
            </Text>
          )}
          {checklistItems.length > 0 && (
            <View
              style={[
                styles.progressBar,
                { backgroundColor: 'rgba(0,0,0,0.08)' },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: secondaryColor,
                    width:
                      `${(checkedCount / checklistItems.length) * 100}%` as any,
                  },
                ]}
              />
            </View>
          )}
        </View>
      ) : note.content ? (
        <Text
          style={[styles.content, { color: secondaryColor }]}
          numberOfLines={4}
        >
          {htmlToPlainText(note.content)}
        </Text>
      ) : null}

      {note.labels && note.labels.length > 0 && (
        <View style={styles.labels}>
          {note.labels.slice(0, 3).map((label) => (
            <View
              key={label}
              style={[
                styles.labelBadge,
                { backgroundColor: 'rgba(0,0,0,0.07)' },
              ]}
            >
              <Text style={[styles.labelText, { color: secondaryColor }]}>
                {label}
              </Text>
            </View>
          ))}
          {note.labels.length > 3 && (
            <View
              style={[
                styles.labelBadge,
                { backgroundColor: 'rgba(0,0,0,0.05)' },
              ]}
            >
              <Text style={[styles.labelText, { color: secondaryColor }]}>
                +{note.labels.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {note.reminderAt && (
        <View style={styles.reminderRow}>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={12}
            color={secondaryColor}
          />
          <Text style={[styles.reminderText, { color: secondaryColor }]}>
            {formatReminder(note.reminderAt)}
          </Text>
        </View>
      )}

      <Text style={[styles.date, { color: secondaryColor }]}>
        {formatDate(note.updatedAt)}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    marginBottom: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  pinBadge: {
    borderRadius: Radius.full,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.one,
  },
  checklistPreview: { marginTop: Spacing.one, gap: 5 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistText: { fontSize: 13, flex: 1 },
  moreText: { fontSize: 11, marginTop: 2 },
  progressBar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.two,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  labelBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  labelText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.two,
  },
  reminderText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, marginTop: Spacing.two, opacity: 0.7 },
})
