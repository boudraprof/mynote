import { Spacing } from '@/constants/theme'
import { useCreateLabel, useLabels } from '@/hooks/use-labels'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

interface LabelPickerProps {
  selectedLabels: string[]
  onChange: (labels: string[]) => void
}

export function LabelPicker({ selectedLabels, onChange }: LabelPickerProps) {
  const theme = useTheme()
  const { data } = useLabels()
  const createLabel = useCreateLabel()
  const [input, setInput] = useState('')

  const allLabels = data?.data ?? []

  const handleAdd = () => {
    const name = input.trim()
    if (!name) return
    if (selectedLabels.includes(name)) {
      setInput('')
      return
    }
    if (!allLabels.find((l) => l.name === name)) {
      createLabel.mutate(name)
    }
    onChange([...selectedLabels, name])
    setInput('')
  }

  const handleRemove = (name: string) => {
    onChange(selectedLabels.filter((l) => l !== name))
  }

  const suggestions = allLabels.filter(
    (l) =>
      l.name.toLowerCase().includes(input.toLowerCase()) &&
      !selectedLabels.includes(l.name),
  )

  return (
    <View style={styles.container}>
      <View style={styles.selectedRow}>
        {selectedLabels.map((label) => (
          <Pressable
            key={label}
            style={[
              styles.badge,
              { backgroundColor: theme.backgroundSelected },
            ]}
            onPress={() => handleRemove(label)}
          >
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {label}
            </Text>
            <MaterialCommunityIcons name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>

      <TextInput
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
        placeholder="Add label..."
        placeholderTextColor={theme.textSecondary}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />

      {input.length > 0 && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestions,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.suggestionItem,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => {
                onChange([...selectedLabels, s.name])
                setInput('')
              }}
            >
              <Text style={[styles.suggestionText, { color: theme.text }]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: { fontSize: 13, fontWeight: 500 },

  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
  },
  suggestions: {
    borderRadius: 10,
    maxHeight: 150,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  suggestionText: { fontSize: 15 },
})
