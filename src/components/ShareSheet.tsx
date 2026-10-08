import { getShares, removeShare, shareNote, type NoteShare } from '@/api/share'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

/**
 * The server returns its own reason for API failures (e.g. 404
 * "This Note already sent to this email", 400 "You cannot share a note with
 * yourself"); surface it instead of a generic message.
 */
function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.errors === 'string'
          ? data.errors
          : undefined
    if (message) return message
  }
  return fallback
}

interface ShareSheetProps {
  visible: boolean
  onClose: () => void
  noteId: string
}

/**
 * Share a note with other users by email (owner only). Mirrors the web
 * ShareDialog: invite by email, list + revoke.
 */
export function ShareSheet({ visible, onClose, noteId }: ShareSheetProps) {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [shares, setShares] = useState<NoteShare[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getShares(noteId)
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to load shares')
      } else {
        setShares(result.data ?? [])
      }
    } catch (error) {
      Alert.alert('Error', errorMessage(error, 'Failed to load shares'))
    } finally {
      setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    if (visible) {
      // Reset the invite form each time the sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on open
      setEmail('')
      void refresh()
    }
  }, [visible, refresh])

  const handleShare = async () => {
    const target = email.trim().toLowerCase()
    if (!target) {
      Alert.alert('Share', 'Enter an email address')
      return
    }
    setBusy(true)
    try {
      const result = await shareNote(noteId, target)
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to share note')
      } else {
        setEmail('')
        await refresh()
      }
    } catch (error) {
      Alert.alert('Error', errorMessage(error, 'Failed to share note'))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (email: string) => {
    setBusy(true)
    try {
      const result = await removeShare(noteId, email)
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to remove share')
      } else {
        await refresh()
      }
    } catch (error) {
      Alert.alert('Error', errorMessage(error, 'Failed to remove share'))
    } finally {
      setBusy(false)
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
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>
            Share note
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
              value={email}
              onChangeText={setEmail}
              placeholder="friend@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!busy}
            />
            <Pressable
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleShare}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={theme.onAccent} />
              ) : (
                <Text style={[styles.shareBtnText, { color: theme.onAccent }]}>Invite</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {loading && shares.length === 0 ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: Spacing.four }} />
            ) : shares.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                Not shared with anyone yet
              </Text>
            ) : (
              shares.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.shareRow,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View style={styles.shareInfo}>
                    <Text style={[styles.shareName, { color: theme.text }]}>
                      {s.name || s.email}
                    </Text>
                    <Text
                      style={[styles.shareEmail, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {s.email}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeBtn,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    onPress={() => handleRemove(s.email)}
                    disabled={busy}
                  >
                    <MaterialCommunityIcons name="close-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
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
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: { fontSize: 18, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
  },
  shareBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 76,
  },
  shareBtnText: { fontSize: 14, fontWeight: '600' },
  list: { marginTop: Spacing.one },
  empty: { textAlign: 'center', paddingVertical: Spacing.four, fontSize: 14 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 14, fontWeight: '600' },
  shareEmail: { fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 6 },
})
