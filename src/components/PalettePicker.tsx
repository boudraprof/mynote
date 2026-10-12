import { backgroundImages, paletteColorValues } from '@/constants/paletteBg'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

interface PalettePickerProps {
  selected: string | null
  onChange: (palette: string | null) => void
}

const paletteKey = (palette: string | null): string | null =>
  palette ? (palette.split('/').pop()?.replace(/\.svg$/, '') ?? palette) : null

const backgroundPath = (key: string) => `/assets/backgrounds/${key}.svg`

export function PalettePicker({ selected, onChange }: PalettePickerProps) {
  const theme = useTheme()
  const colors = Object.entries(paletteColorValues)
  const backgrounds = Object.entries(backgroundImages)
  const currentKey = paletteKey(selected)

  const handlePick = (palette: string) => {
    const next = paletteKey(palette) === currentKey ? null : palette
    onChange(next)
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Colors</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {colors.map(([key, value]) => {
          const isSelected = key === currentKey
          return (
            <Pressable
              key={key}
              accessibilityLabel={key}
              onPress={() => handlePick(key)}
              style={[
                styles.swatch,
                { backgroundColor: value },
                isSelected && {
                  borderColor: theme.accent,
                  borderWidth: 2,
                },
              ]}
            />
          )
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Backgrounds</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {backgrounds.map(([key, source]) => {
          const isSelected = key === currentKey
          return (
            <Pressable
              key={key}
              accessibilityLabel={key}
              onPress={() => handlePick(backgroundPath(key))}
              style={[
                styles.swatch,
                styles.imageSwatch,
                {
                  borderColor: isSelected ? theme.accent : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.one,
  },
  row: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  imageSwatch: {
    overflow: 'hidden',
    borderRadius: 18,
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
})
