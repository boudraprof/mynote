import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Radius, Spacing } from '@/constants/theme'
import { useCreateLabel, useLabels } from '@/hooks/use-labels'
import { useUpdateNote } from '@/hooks/use-notes'
import { useTheme } from '@/hooks/use-theme'

function parseArray(value?: string): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export default function NoteLabelsScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ ids?: string; labels?: string }>()
  const { data, isLoading } = useLabels()
  const createLabel = useCreateLabel()
  const updateNote = useUpdateNote()

  const ids = useMemo(() => parseArray(params.ids), [params.ids])
  const [selected, setSelected] = useState<string[]>(() => parseArray(params.labels))
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const allLabels = useMemo(() => data?.data ?? [], [data])

  const toggle = useCallback((name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((label) => label !== name) : [...prev, name],
    )
  }, [])

  const handleCreate = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    if (!allLabels.some((label) => label.name === name)) {
      createLabel.mutate(name)
    }
    setSelected((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setNewName('')
  }, [newName, allLabels, createLabel])

  const handleSave = useCallback(async () => {
    if (ids.length === 0) {
      router.back()
      return
    }
    setSaving(true)
    try {
      for (const id of ids) {
        await updateNote.mutateAsync({ id, labels: selected })
      }
      router.back()
    } catch {
      Alert.alert('Labels', 'Failed to update labels')
    } finally {
      setSaving(false)
    }
  }, [ids, selected, updateNote])

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Labels',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerRight: () =>
            saving ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Pressable onPress={handleSave} hitSlop={8}>
                <Text style={[styles.saveText, { color: theme.accent }]}>Save</Text>
              </Pressable>
            ),
        }}
      />

      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        {ids.length > 1
          ? `Applying labels to ${ids.length} notes`
          : 'Select labels for this note'}
      </Text>

      <View style={styles.createRow}>
        <TextInput
          style={[
            styles.createInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
          placeholder="Create new label..."
          placeholderTextColor={theme.textSecondary}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleCreate}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="plus" size={22} color={theme.onAccent} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={styles.loading}
        />
      ) : (
        <FlatList
          data={allLabels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
          renderItem={({ item }) => {
            const checked = selected.includes(item.name)
            return (
              <Pressable
                onPress={() => toggle(item.name)}
                style={({ pressed }) => [
                  styles.labelRow,
                  {
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={checked ? theme.accent : theme.textSecondary}
                />
                <Text style={[styles.labelName, { color: theme.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No labels yet. Create one above.
            </Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  saveText: { fontSize: 16, fontWeight: 600 },
  hint: {
    fontSize: 13,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  createInput: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { marginTop: Spacing.six },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelName: { fontSize: 16 },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    fontSize: 14,
  },
})
