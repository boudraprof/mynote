import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'
import ViewShot, { type ViewShotRef } from 'react-native-view-shot'

interface Point {
  x: number
  y: number
}

interface Stroke {
  color: string
  width: number
  path: string
}

interface DrawingEditorProps {
  visible: boolean
  onClose: () => void
  onSave: (uri: string) => void
}

const PEN_COLORS = [
  '#1A1A1A',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#1A73E8',
  '#8AB4F8',
  '#8B5CF6',
  '#EC4899',
]

const PEN_WIDTHS = [3, 6, 10]

const CANVAS_HEIGHT = 360

export function DrawingEditor({ visible, onClose, onSave }: DrawingEditorProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const viewShotRef = useRef<ViewShotRef>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [current, setCurrent] = useState<Stroke | null>(null)
  const [color, setColor] = useState(PEN_COLORS[0])
  const [width, setWidth] = useState(PEN_WIDTHS[1])
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setStrokes([])
    setCurrent(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const handleStart = useCallback(
    (point: Point) => {
      setCurrent({ color, width, path: `M ${point.x} ${point.y}` })
    },
    [color, width],
  )

  const handleMove = useCallback((point: Point) => {
    setCurrent((prev) => {
      if (!prev) return prev
      return { ...prev, path: `${prev.path} L ${point.x} ${point.y}` }
    })
  }, [])

  const handleEnd = useCallback(() => {
    setCurrent((prev) => {
      if (prev) setStrokes((s) => [...s, prev])
      return null
    })
  }, [])

  const handleSavePress = useCallback(async () => {
    if (strokes.length === 0) {
      Alert.alert('Nothing to save', 'Draw something first.')
      return
    }
    setSaving(true)
    try {
      const uri = await viewShotRef.current?.capture?.()
      if (uri) {
        onSave(uri)
        reset()
        onClose()
      } else {
        Alert.alert('Error', 'Failed to capture drawing')
      }
    } catch {
      Alert.alert('Error', 'Failed to save drawing')
    } finally {
      setSaving(false)
    }
  }, [strokes.length, onSave, onClose, reset])

  if (!visible) return null

  const allStrokes = current ? [...strokes, current] : strokes

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerBtn}>
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Drawing</Text>
          <Pressable
            onPress={handleSavePress}
            disabled={saving}
            style={({ pressed }) => [
              styles.headerBtn,
              { opacity: saving ? 0.5 : pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="check-outline" size={24} color={theme.accent} />
          </Pressable>
        </View>

        {/* Canvas */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 0.9 }}
          style={styles.canvasWrap}
        >
          <View
            style={[styles.canvasBg, { backgroundColor: '#FFFFFF' }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              handleStart({
                x: e.nativeEvent.locationX,
                y: e.nativeEvent.locationY,
              })
            }
            onResponderMove={(e) =>
              handleMove({
                x: e.nativeEvent.locationX,
                y: e.nativeEvent.locationY,
              })
            }
            onResponderRelease={handleEnd}
          >
            <Svg
              height={CANVAS_HEIGHT}
              width={Dimensions.get('window').width}
              style={styles.svg}
            >
              <Rect
                x={0}
                y={0}
                width="100%"
                height={CANVAS_HEIGHT}
                fill="#FFFFFF"
              />
              {allStrokes.map((s, i) => (
                <Path
                  key={i}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={s.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
        </ViewShot>

        {/* Toolbar */}
        <View
          style={[
            styles.toolbar,
            { paddingBottom: insets.bottom + Spacing.two },
          ]}
        >
          {/* Color row */}
          <View style={styles.colorRow}>
            {PEN_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={({ pressed }) => [
                  styles.colorDot,
                  {
                    backgroundColor: c,
                    borderColor: color === c ? theme.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              />
            ))}
          </View>

          {/* Width + actions */}
          <View style={styles.actionRow}>
            {PEN_WIDTHS.map((w) => (
              <Pressable
                key={w}
                onPress={() => setWidth(w)}
                style={[
                  styles.widthBtn,
                  {
                    backgroundColor:
                      width === w ? theme.accentLight : theme.backgroundElement,
                  },
                ]}
              >
                <View
                  style={{
                    width: w + 4,
                    height: w + 4,
                    borderRadius: (w + 4) / 2,
                    backgroundColor: width === w ? theme.accent : theme.textSecondary,
                  }}
                />
              </Pressable>
            ))}

            <View style={styles.spacer} />

            <Pressable
              onPress={() => setStrokes((s) => s.slice(0, -1))}
              disabled={strokes.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: strokes.length === 0 ? 0.4 : pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="undo" size={20} color={theme.text} />
            </Pressable>

            <Pressable
              onPress={reset}
              disabled={strokes.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: strokes.length === 0 ? 0.4 : pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: { padding: Spacing.one },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  canvasWrap: { alignItems: 'center' },
  canvasBg: { width: '100%', alignItems: 'center' },
  svg: { backgroundColor: '#FFFFFF' },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  widthBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
})
