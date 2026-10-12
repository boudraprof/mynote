import { backgroundImages, paletteColorValues } from '@/constants/paletteBg'
import { useTheme } from '@/hooks/use-theme'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Dialog, Portal } from 'react-native-paper'

/**
 * Stored palettes are either a colour key ("coral") or a background path
 * ("/assets/backgrounds/<name>.svg", as written by the web app). Normalise both
 * to the bare key used by `backgroundImages`.
 */
const paletteKey = (palette: string | null): string | null =>
  palette ? (palette.split('/').pop()?.replace(/\.svg$/, '') ?? palette) : null

const backgroundPath = (key: string) => `/assets/backgrounds/${key}.svg`

interface PaletteDialogProps {
  visible: boolean
  onClose: () => void
  /** Current palette key, or null for none. */
  currentPalette: string | null
  /** Persist the chosen palette key, or null to clear. */
  onSave: (palette: string | null) => void
}

/**
 * Color-only picker shown as a dialog module (Paper Dialog), not an
 * ActionSheet — matches the palette set shared with the web app.
 */
export function PaletteDialog({
  visible,
  onClose,
  currentPalette,
  onSave,
}: PaletteDialogProps) {
  const theme = useTheme()
  const colors = Object.entries(paletteColorValues)
  const backgrounds = Object.entries(backgroundImages)
  const currentKey = paletteKey(currentPalette)

  const handlePick = (palette: string) => {
    void onSave(paletteKey(palette) === currentKey ? null : palette)
    onClose()
  }

  const handleClear = () => {
    void onSave(null)
    onClose()
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title style={{ color: theme.text }}>Palette</Dialog.Title>
        <Dialog.Content>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Colors
            </Text>
            <View style={styles.row}>
              {colors.map(([key, hex]) => {
                const selected = key === currentKey
                return (
                  <Pressable
                    key={key}
                    accessibilityLabel={key}
                    onPress={() => handlePick(key)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: hex,
                        borderColor: selected
                          ? theme.accent
                          : theme.border,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  />
                )
              })}
              {currentPalette && (
                <Pressable
                  accessibilityLabel="Clear"
                  onPress={handleClear}
                  style={[
                    styles.swatch,
                    styles.clearSwatch,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.danger,
                    },
                  ]}
                >
                  <View style={[styles.clearMark, { backgroundColor: theme.danger }]} />
                </Pressable>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Backgrounds
            </Text>
            <View style={styles.row}>
              {backgrounds.map(([key, source]) => {
                const selected = key === currentKey
                return (
                  <Pressable
                    key={key}
                    accessibilityLabel={key}
                    onPress={() => handlePick(backgroundPath(key))}
                    style={[
                      styles.swatch,
                      styles.imageSwatch,
                      {
                        borderColor: selected ? theme.accent : theme.border,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={source}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  </Pressable>
                )
              })}
            </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  swatch: {
    width: 50,
    height: 50,
    borderRadius: 50,
    margin: 3,
  },
  imageSwatch: {
    overflow: 'hidden',
  },
  clearSwatch: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearMark: {
    width: 18,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
})
