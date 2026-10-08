import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextInput } from 'react-native-paper'

import { useTheme } from '@/hooks/use-theme'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { signUpEmail } from '@/lib/auth'

export default function SignupScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all required fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signUpEmail({ email, password, name })
      router.replace('/')
    } catch (e: any) {
      setError(e?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandSection}>
          <View style={[styles.logoContainer, { backgroundColor: theme.accentLight }]}>
            <Image source={require('../../../assets/logo128.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>Start organizing your notes today</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.md]}>
          {error !== '' && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderColor: 'rgba(239,68,68,0.45)',
                },
              ]}
            >
              <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <View style={styles.fields}>
            <View style={styles.field}>
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Name *</Text>*/}
              <TextInput
                style={[{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                value={name}
                onChangeText={setName}
                placeholderTextColor={theme.textSecondary}
                label={"Name"}
                mode="outlined"
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.field}>
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Email *</Text>*/}
              <TextInput
                style={[{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                value={email}
                onChangeText={setEmail}
                label={"Email"}
                mode="outlined"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Password *</Text>*/}
              <TextInput
                style={[{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                value={password}
                onChangeText={setPassword}
                label={"Password"}
                mode="outlined"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.field}>
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password *</Text>*/}
              <TextInput
                style={[{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                label="Repeat password"
                mode="outlined"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: theme.onAccent }]}>
                Create Account
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account?</Text>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.footerLink, { color: theme.accent }]}> Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
  brandSection: { alignItems: 'center', gap: Spacing.two },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  appName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  tagline: { fontSize: 14 },
  card: { borderRadius: Radius.xl, padding: Spacing.four, gap: Spacing.three },
  errorBanner: { borderRadius: Radius.md, padding: Spacing.three, borderWidth: 1 },
  fields: { gap: Spacing.three },
  field: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
  },
  primaryBtn: { borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.one },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
})
