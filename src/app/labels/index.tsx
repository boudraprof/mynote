import type { Label } from '@/api/labels'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import {
  useCreateLabel,
  useDeleteLabel,
  useLabels,
  useUpdateLabel,
} from '@/hooks/use-labels'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Button, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function LabelsScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useLabels()
  const createLabel = useCreateLabel()
  const updateLabel = useUpdateLabel()
  const deleteLabel = useDeleteLabel()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const labels = data?.data ?? []

  const handleCreate = useCallback(async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await createLabel.mutateAsync(name)
      setNewName('')
    } catch {
      Alert.alert('Error', 'Failed to create label')
    }
  }, [newName, createLabel])

  const handleRename = useCallback(
    async (id: string) => {
      const name = editName.trim()
      if (!name) return
      try {
        await updateLabel.mutateAsync({ id, name })
        setEditingId(null)
        setEditName('')
      } catch {
        Alert.alert('Error', 'Failed to rename label')
      }
    },
    [editName, updateLabel],
  )

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert('Delete Label', `Are you sure you want to delete label "${name}"? Notes with this label won't be deleted.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLabel.mutateAsync(id)
            } catch {
              Alert.alert('Error', 'Failed to delete label')
            }
          },
        },
      ])
    },
    [deleteLabel],
  )

  const renderLabel = ({ item }: { item: Label }) => (
    <View
      style={[styles.labelRow, { borderBottomColor: theme.border }]}
    >
      {editingId === item.id ? (
        <View style={styles.editRow}>
          <TextInput
            style={[
              styles.editInput,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
            value={editName}
            onChangeText={setEditName}
            autoFocus
            onSubmitEditing={() => handleRename(item.id)}
          />
          <Button
            onPress={() => handleRename(item.id)}
            mode="contained"
            buttonColor={theme.accent}
            textColor={theme.onAccent}
            style={styles.rowBtn}
          >
            Save
          </Button>
          <Button
            onPress={() => setEditingId(null)}
            mode="contained"
            buttonColor={theme.backgroundElement}
            textColor={theme.textSecondary}
            style={styles.rowBtn}
          >
            Cancel
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.labelInfo}>
            <MaterialCommunityIcons name="tag" size={18} color={theme.text} style={{ marginRight: 8 }} />
            <Text style={[styles.labelName, { color: theme.text }]}>
              {item.name}
            </Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              onPress={() => {
                setEditingId(item.id)
                setEditName(item.name)
              }}
              icon="pencil-outline"
              iconColor={theme.text}
              size={16}
              mode="contained"
              containerColor={theme.backgroundElement}
              style={styles.actionIconBtn}
            />
            <IconButton
              onPress={() => handleDelete(item.id, item.name)}
              icon="trash-can-outline"
              iconColor="#EF4444"
              size={16}
              mode="contained"
              containerColor="rgba(239, 68, 68, 0.1)"
              style={styles.actionIconBtn}
            />
          </View>
        </>
      )}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Manage Labels',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />

      <View
        style={[styles.createRow, { paddingTop: Spacing.two }]}
      >
        <TextInput
          style={[
            styles.createInput,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
          placeholder="Create new label..."
          placeholderTextColor={theme.textSecondary}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Button
          mode="contained"
          buttonColor={theme.accent}
          textColor={theme.onAccent}
          loading={createLabel.isPending}
          disabled={createLabel.isPending}
          onPress={handleCreate}
          style={[styles.addBtn, Shadow.sm]}
        >
          Add
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={{ marginTop: Spacing.six }}
        />
      ) : (
        <FlatList
          data={labels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
          renderItem={renderLabel}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No labels yet. Create one above to organize notes.
            </Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  createRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  createInput: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  addBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  labelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelName: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  rowBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  editInput: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    fontSize: 15,
    borderWidth: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.six,
    fontSize: 14,
    paddingHorizontal: Spacing.five,
    lineHeight: 20,
  },
})
