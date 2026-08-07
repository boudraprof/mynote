import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import type { NoteVersion } from '@/lib/note-history'

interface HistoryModalProps {
  visible: boolean
  onClose: () => void
  isLoading: boolean
  versions: NoteVersion[]
  /** Apply a saved version back onto the editor. */
  onRestoreVersion: (versionId: string) => void | Promise<void>
}

export function HistoryModal({
  visible,
  onClose,
  isLoading,
  versions,
  onRestoreVersion,
}: HistoryModalProps) {
  const theme = useTheme()

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
          <Text style={[styles.sheetTitle, { color: theme.text }]}>
            Version history
          </Text>
          {isLoading ? (
            <ActivityIndicator
              color={theme.accent}
              style={{ marginVertical: Spacing.four }}
            />
          ) : versions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No versions saved yet
            </Text>
          ) : (
            <ScrollView style={styles.historyList}>
              {versions.map((v) => (
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
                          onPress: () => void onRestoreVersion(v.id),
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
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
    fontSize: 14,
  },
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
