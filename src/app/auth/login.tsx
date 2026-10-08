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
  // TextInput,
  View,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextInput } from 'react-native-paper'


import { useTheme } from '@/hooks/use-theme'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { signInEmail } from '@/lib/auth'


export default function LoginScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('');


  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await signInEmail({ email, password })
      console.log(res)
      if (res) {
        router.replace('/')
      } else {
        setError('Login failed')
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed')
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
          { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandSection}>
          <View style={[styles.logoContainer, { backgroundColor: theme.accentLight }]}>
            <Image source={require('../../../assets/logo128.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>My Notes</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>Organize your thoughts anywhere</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.md]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Sign in to continue</Text>

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
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>*/}
              <TextInput
                style={{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }}
                value={email}
                onChangeText={setEmail}
                label={"Email"}
                // placeholder="you@example.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                mode='outlined'
              />
            </View>

            <View style={styles.field}>
              {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>*/}
              <TextInput
                style={{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }}
                value={password}
                onChangeText={setPassword}
                label={"Password"}
                mode="outlined"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: theme.onAccent }]}>
                Sign In
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => router.replace('/auth/signup')}>
            <Text style={[styles.footerLink, { color: theme.accent }]}> Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
  brandSection: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },

  appName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 15 },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  formTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  formSubtitle: { fontSize: 14, marginTop: -Spacing.two },
  errorBanner: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
  },
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
  primaryBtn: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.two },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
})
