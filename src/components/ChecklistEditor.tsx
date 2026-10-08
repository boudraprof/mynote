import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistEditorProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const theme = useTheme()

  const toggle = (index: number) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item,
    )
    onChange(next)
  }

  const updateText = (index: number, text: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, text } : item,
    )
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const add = () => {
    onChange([...items, { text: '', checked: false }])
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={index} style={styles.row}>
          <Pressable
            style={[styles.checkbox, { borderColor: theme.textSecondary }]}
            onPress={() => toggle(index)}
          >
            {item.checked && (
              <MaterialCommunityIcons name="check-outline" size={14} color={theme.text} />
            )}
          </Pressable>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                textDecorationLine: item.checked ? 'line-through' : 'none',
                opacity: item.checked ? 0.5 : 1,
              },
            ]}
            value={item.text}
            onChangeText={(v) => updateText(index, v)}
            placeholder="List item"
            placeholderTextColor={theme.textSecondary}
          />
          <Pressable onPress={() => remove(index)} style={styles.removeBtn}>
            <MaterialCommunityIcons name="close-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      ))}
      <Pressable
        style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.6 : 1 }]}
        onPress={add}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="plus" size={20} color={theme.textSecondary} />
          <Text style={[styles.addText, { color: theme.textSecondary }]}>
            Add item
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  removeBtn: {
    padding: 4,
  },
  addBtn: {
    paddingVertical: Spacing.two,
  },
  addText: { fontSize: 15, fontWeight: 500 },
})
