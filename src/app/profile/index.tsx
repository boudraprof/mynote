import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TextInput } from 'react-native-paper'


import { useTheme } from '@/hooks/use-theme'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { useThemePreference } from '@/providers/theme-provider'
import type { ThemePreference } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'
import * as ImagePicker from 'expo-image-picker'
import { config } from '@/lib/env'
import { changeEmail, changePassword, deleteUser, updateUser } from '@/lib/auth'
import { uploadImage } from '@/api/upload'
import { getNotes } from '@/api/notes'

export default function ProfileScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const { preference, setPreference } = useThemePreference()

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [imageUrl, setImageUrl] = useState(user?.image ?? '')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const uploadResult = await uploadImage(
          {
            uri: asset.uri,
            name: asset.fileName || 'photo.jpg',
            type: asset.mimeType || 'image/jpeg',
          },
          'avatars',
        )
        if (uploadResult.url) {
          setImageUrl(uploadResult.url)
          await updateUser({ image: uploadResult.url })
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to update profile image')
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      if (name !== user?.name) {
        await updateUser({ name })
      }
      if (email !== user?.email) {
        await changeEmail({ newEmail: email })
      }
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match')
          setSaving(false)
          return
        }
        if (!currentPassword) {
          Alert.alert('Error', 'Current password required')
          setSaving(false)
          return
        }
        await changePassword({ currentPassword, newPassword })
      }
      Alert.alert('Saved', 'Profile updated successfully')
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }, [name, email, currentPassword, newPassword, confirmPassword, user])

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await getNotes({ limit: 10000 })
      const notes = (result.data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        labels: n.labels ?? [],
        pinned: n.pinned ?? false,
        checklist: n.checklist ?? false,
        checklistItems: n.checklistItems ?? null,
        palette: n.palette ?? null,
        image: n.image ?? null,
        reminderAt: n.reminderAt ?? null,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }))
      await Share.share({
        title: 'My Notes export',
        message: JSON.stringify({ exportedAt: new Date().toISOString(), notes }, null, 2),
      })
    } catch {
      Alert.alert('Error', 'Failed to export notes')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password')
      return
    }
    try {
      await deleteUser({ password: deletePassword, callbackURL: '/' })
      await signOut()
    } catch {
      Alert.alert('Error', 'Failed to delete account')
    }
  }, [deletePassword, signOut])

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
    >
      <Stack.Screen
        options={{
          title: 'Profile Settings',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginRight: 8, padding: 4 }}
            >
              <Ionicons name="arrow-back-outline" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Profile Header Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            {imageUrl ? (
              <Image
                source={{
                  uri: imageUrl.startsWith('http')
                    ? imageUrl
                    : `${config.apiUrl}${imageUrl}`,
                }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.accentLight },
                ]}
              >
                <Text style={[styles.avatarLetter, { color: theme.accent }]}>
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.changePhoto, { color: theme.accent }]}>
              Change profile photo
            </Text>
          </Pressable>
        </View>

        {/* Details Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Personal Details</Text>

          <View style={styles.field}>
            {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>*/}
            <TextInput
              style={[
                // styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={name}
              label="Name"
              mode="outlined"
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>*/}
            <TextInput
              style={[
                // styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={email}
              onChangeText={setEmail}
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Password Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          {/*<Text style={[styles.cardTitle, { color: theme.text }]}>Security Settings</Text>*/}

          <View style={styles.field}>
            {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Current Password</Text>*/}
            <TextInput
              style={[
                // styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              // placeholder="Leave blank to keep"
              label="Current Password"
              mode="outlined"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.field}>
            {/*<Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>*/}
            <TextInput
              style={[
                // styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              label="New Password"
              mode="outlined"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.field}>
            {/*<Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>*/}
            <TextInput
              style={[
                // styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              label="Confirm Password"
              mode="outlined"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Appearance Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Appearance</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>
            Choose how the app looks. &ldquo;System&rdquo; follows your device
            setting.
          </Text>
          <View style={styles.themeOptionsRow}>
            {themeOptions.map((option) => {
              const selected = preference === option.value
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: selected
                        ? theme.accent
                        : theme.backgroundElement,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setPreference(option.value)}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: selected ? '#fff' : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.saveBtnText]}>
              Save Changes
            </Text>
          )}
        </Pressable>

        {/* Export Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Data</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>
            Export all your notes as JSON.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                backgroundColor: theme.backgroundElement,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <Text style={[styles.deleteText, { color: theme.accent }]}>
                Export Notes
              </Text>
            )}
          </Pressable>
        </View>

        {/* Danger Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.danger, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: theme.danger }]}>Danger Zone</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: Spacing.two }}>
            Once you delete your account, there is no going back. Please be certain.
          </Text>

          {!showDeleteConfirm ? (
            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={[styles.deleteText, { color: theme.danger }]}>
                Delete Account...
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: Spacing.two }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Enter your password to confirm
              </Text>
              <TextInput
                style={[
                  // styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                  // placeholder="Password"
                  label="Password"
                  mode="outlined"
                placeholderTextColor={theme.textSecondary}
              />
              <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: 10 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.dangerCancelBtn,
                    { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => {
                    setShowDeleteConfirm(false)
                    setDeletePassword('')
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.dangerConfirmBtn,
                    { backgroundColor: theme.danger, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={handleDeleteAccount}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Delete Account</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  avatarContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 36, fontWeight: '700' },
  changePhoto: { fontSize: 14, fontWeight: '600', marginTop: Spacing.one },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  field: { gap: Spacing.one },
  themeOptionsRow: { flexDirection: 'row', gap: Spacing.two },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  themeOptionText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: {
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: { fontSize: 14, fontWeight: '600' },
  dangerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  dangerConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
})
