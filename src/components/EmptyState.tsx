import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  subtitle?: string
}

export function EmptyState({ icon = 'file-document-outline', title, subtitle }: EmptyStateProps) {
  const theme = useTheme()
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MaterialCommunityIcons name={icon} size={48} color={theme.textSecondary} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.one,
    lineHeight: 22,
  },
})
