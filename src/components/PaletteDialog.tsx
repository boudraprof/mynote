import { paletteColorValues } from '@/constants/paletteBg'
import { useTheme } from '@/hooks/use-theme'
import { Pressable, StyleSheet, View } from 'react-native'
import { Dialog, Portal } from 'react-native-paper'

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

  const handlePick = (key: string) => {
    void onSave(key === currentPalette ? null : key)
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
            <View style={styles.row}>
              {colors.map(([key, hex]) => {
                const selected = key === currentPalette
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
        </Dialog.Content>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  swatch: {
    width: 50,
    height: 50,
    borderRadius: 50,
    margin: 3,
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
