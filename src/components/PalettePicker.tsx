import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

const COLORS = [
  { name: 'coral', value: '#f4a460' },
  { name: 'peach', value: '#ffdab9' },
  { name: 'sand', value: '#f5deb3' },
  { name: 'mint', value: '#98fb98' },
  { name: 'sage', value: '#bcb88a' },
  { name: 'fog', value: '#dcdcdc' },
  { name: 'storm', value: '#708090' },
  { name: 'dusk', value: '#b0c4de' },
  { name: 'blossom', value: '#ffb7c5' },
  { name: 'clay', value: '#c4a882' },
  { name: 'chalk', value: '#f5f5dc' },
  { name: 'none', value: null },
] as const

const BACKGROUND_IMAGES = [
  { name: 'bg-grid', label: 'Grid', icon: '⊞' },
  { name: 'bg-dots', label: 'Dots', icon: '·' },
  { name: 'bg-waves', label: 'Waves', icon: '∿' },
  { name: 'bg-floral', label: 'Floral', icon: '❀' },
  { name: 'bg-geometric', label: 'Geometric', icon: '◆' },
  { name: 'bg-marble', label: 'Marble', icon: '◑' },
] as const

interface PalettePickerProps {
  selected: string | null
  onChange: (palette: string | null) => void
}

export function PalettePicker({ selected, onChange }: PalettePickerProps) {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Colors</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {COLORS.map((c) => {
          const isSelected = selected === c.name
          return (
            <Pressable
              key={c.name}
              style={[
                styles.swatch,
                c.value ? { backgroundColor: c.value } : { backgroundColor: theme.backgroundElement },
                isSelected && { borderColor: theme.accent, borderWidth: 2.5 },
                isSelected && Shadow.sm,
              ]}
              onPress={() => onChange(c.name === 'none' ? null : c.name)}
            >
              {c.value === null && (
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              )}
              {isSelected && c.value !== null && (
                <Ionicons name="checkmark-outline" size={16} color="#333" />
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Backgrounds</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {BACKGROUND_IMAGES.map((bg) => {
          const isSelected = selected === bg.name
          return (
            <Pressable
              key={bg.name}
              style={[
                styles.bgSwatch,
                { backgroundColor: theme.backgroundElement },
                isSelected && { borderColor: theme.accent, borderWidth: 2.5 },
              ]}
              onPress={() => onChange(isSelected ? null : bg.name)}
            >
              <Text style={[
                styles.bgLabel,
                { color: isSelected ? theme.accent : theme.textSecondary },
              ]}>
                {bg.icon}
              </Text>
              <Text style={[styles.bgText, { color: theme.textSecondary }]}>{bg.label}</Text>
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: theme.accent }]} />
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgSwatch: {
    width: 72,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  bgLabel: { fontSize: 18, fontWeight: '600' },
  bgText: { fontSize: 9, marginTop: 2, fontWeight: '500' },
  selectedDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
