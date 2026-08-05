import { useEffect, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTheme } from '@/hooks/use-theme'
import { Radius, Spacing } from '@/constants/theme'

interface ReminderSheetProps {
  visible: boolean
  onClose: () => void
  /** Current reminder as ISO string, or null */
  currentReminder: string | null
  /** Persist the reminder (ISO string) or clear it (null) */
  onSave: (reminderAt: string | null) => void
}

function toLocalInput(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function presetDate(hoursFromNow: number, hour?: number, minute = 0): string {
  const d = new Date()
  if (hour !== undefined) {
    d.setDate(d.getDate() + hoursFromNow)
    d.setHours(hour, minute, 0, 0)
  } else {
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000)
  }
  return d.toISOString()
}

const PRESETS = [
  { label: 'In 1 hour', iso: () => presetDate(1) },
  { label: 'Tonight 9:00 PM', iso: () => presetDate(0, 21) },
  { label: 'Tomorrow 9:00 AM', iso: () => presetDate(1, 9) },
  { label: 'Next week 9:00 AM', iso: () => presetDate(7, 9) },
]

/**
 * Bottom-sheet reminder picker: quick presets plus a manual YYYY-MM-DD HH:MM
 * input. Persists an ISO string via the same `reminderAt` contract the web
 * app uses.
 */
export function ReminderSheet({
  visible,
  onClose,
  currentReminder,
  onSave,
}: ReminderSheetProps) {
  const theme = useTheme()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      const { date: d, time: t } = toLocalInput(currentReminder)
      // Seed the draft inputs from the note's current reminder each time the
      // sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed inputs on open
      setDate(d)
      setTime(t)
    }
  }, [visible, currentReminder])

  const handleSave = async () => {
    if (!date.trim() || !time.trim()) {
      Alert.alert('Reminder', 'Enter both a date (YYYY-MM-DD) and time (HH:MM)')
      return
    }
    const parsed = new Date(`${date.trim()}T${time.trim()}`)
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert('Reminder', 'Invalid date or time')
      return
    }
    setSaving(true)
    try {
      await onSave(parsed.toISOString())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await onSave(null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[styles.sheet, { backgroundColor: theme.surface }]}
        >
          <View
            style={[styles.handle, { backgroundColor: theme.border }]}
          />
          <Text style={[styles.title, { color: theme.text }]}>Reminder</Text>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.label}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={async () => {
                  setSaving(true)
                  try {
                    await onSave(p.iso())
                    onClose()
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <Text style={[styles.presetText, { color: theme.text }]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Custom (YYYY-MM-DD HH:MM)
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="2026-02-01"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              value={time}
              onChangeText={setTime}
              placeholder="14:30"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.actions}>
            {currentReminder && (
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleClear}
                disabled={saving}
              >
                <Text style={[styles.btnText, { color: theme.danger }]}>
                  Clear reminder
                </Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.saveBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>Set</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: { fontSize: 18, fontWeight: '700' },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  presetChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  btn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtn: { flex: 1 },
  btnText: { fontSize: 15, fontWeight: '600' },
})
