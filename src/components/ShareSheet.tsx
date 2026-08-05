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
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/use-theme'
import { Radius, Spacing } from '@/constants/theme'
import { getShares, removeShare, shareNote, type NoteShare } from '@/api/share'

interface ShareSheetProps {
  visible: boolean
  onClose: () => void
  noteId: string
}

/**
 * Share a note with other users by email (owner only). Mirrors the web
 * ShareDialog: invite by email, pick read/edit permission, list + revoke.
 */
export function ShareSheet({ visible, onClose, noteId }: ShareSheetProps) {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'read' | 'edit'>('read')
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
    } catch {
      Alert.alert('Error', 'Failed to load shares')
    } finally {
      setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    if (visible) {
      // Reset the invite form each time the sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on open
      setEmail('')
      setPermission('read')
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
      const result = await shareNote(noteId, target, permission)
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to share note')
      } else {
        setEmail('')
        await refresh()
      }
    } catch {
      Alert.alert('Error', 'Failed to share note')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (sharedWithId: string) => {
    setBusy(true)
    try {
      const result = await removeShare(noteId, sharedWithId)
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to remove share')
      } else {
        await refresh()
      }
    } catch {
      Alert.alert('Error', 'Failed to remove share')
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.shareBtnText}>Invite</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.permissionRow}>
            {(['read', 'edit'] as const).map((p) => (
              <Pressable
                key={p}
                style={({ pressed }) => [
                  styles.permissionChip,
                  {
                    backgroundColor:
                      permission === p
                        ? theme.accent
                        : theme.backgroundElement,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => setPermission(p)}
              >
                <Text
                  style={[
                    styles.permissionText,
                    { color: permission === p ? '#fff' : theme.text },
                  ]}
                >
                  {p === 'read' ? 'Can view' : 'Can edit'}
                </Text>
              </Pressable>
            ))}
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
                      {s.email} · {s.permission === 'edit' ? 'Can edit' : 'Can view'}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeBtn,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    onPress={() => handleRemove(s.sharedWithId)}
                    disabled={busy}
                  >
                    <Ionicons name="close-outline" size={18} color={theme.danger} />
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
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  permissionRow: { flexDirection: 'row', gap: Spacing.two },
  permissionChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  permissionText: { fontSize: 13, fontWeight: '600' },
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
