import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/hooks/use-theme'
import { Spacing } from '@/constants/theme'

interface LoadingViewProps {
  message?: string
}

export function LoadingView({ message }: LoadingViewProps) {
  const theme = useTheme()
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.text} />
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
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
  },
  message: {
    marginTop: Spacing.three,
    fontSize: 15,
  },
})
