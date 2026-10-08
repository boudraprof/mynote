import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { TextInput } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getAllNotes } from '@/api/notes'
import { uploadImage } from '@/api/upload'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { useImageSource } from '@/hooks/use-image-source'
import { useTheme } from '@/hooks/use-theme'
import { changeEmail, changePassword, deleteUser, updateUser } from '@/lib/auth'
import { useAuth } from '@/providers/auth-provider'
import type { ThemePreference } from '@/providers/theme-provider'
import { useThemePreference } from '@/providers/theme-provider'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = { name?: string; email?: string; password?: string }

function formatUpdatedAt(value: string | Date | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
}

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
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const avatarSource = useImageSource(imageUrl)

  // Seed the form when the session hydrates (and re-seed if the account
  // changes). Derived during render rather than in an effect, per React's
  // "adjusting state when a prop changes" pattern.
  const [seededUserId, setSeededUserId] = useState<string | null>(null)
  if (user && user.id !== seededUserId) {
    setSeededUserId(user.id)
    setName(user.name)
    setEmail(user.email)
    setImageUrl(user.image ?? '')
  }

  const handlePickImage = async () => {
    if (uploadingImage) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to change your photo.'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      setUploadingImage(true)
      const uploadResult = await uploadImage(
        {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        'avatars',
      )
      if (!uploadResult.url) {
        Alert.alert('Error', uploadResult.errors || 'Failed to upload image')
        return
      }
      await updateUser({ image: uploadResult.url })
      setImageUrl(uploadResult.url)
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to update profile image'
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    Alert.alert('Remove photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setUploadingImage(true)
            // The server deletes the stored file when image is set to null.
            await updateUser({ image: null })
            setImageUrl('')
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Failed to remove photo'
            )
          } finally {
            setUploadingImage(false)
          }
        },
      },
    ])
  }

  const handleReset = () => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrors({})
  }

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const nameChanged = trimmedName !== (user?.name ?? '')
    const emailChanged =
      trimmedEmail.toLowerCase() !== (user?.email ?? '').toLowerCase()
    const passwordChanged = Boolean(
      currentPassword || newPassword || confirmPassword
    )

    const nextErrors: FieldErrors = {}
    if (nameChanged && (trimmedName.length < 2 || trimmedName.length > 30)) {
      nextErrors.name = 'Name must be 2-30 characters'
    }
    if (emailChanged && !EMAIL_RE.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address'
    }
    if (passwordChanged) {
      if (!currentPassword) {
        nextErrors.password = 'Enter your current password'
      } else if (newPassword.length < 8 || newPassword.length > 40) {
        nextErrors.password = 'New password must be 8-40 characters'
      } else if (newPassword !== confirmPassword) {
        nextErrors.password = 'Passwords do not match'
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!nameChanged && !emailChanged && !passwordChanged) {
      Alert.alert('No changes', 'There is nothing to save yet.')
      return
    }

    setSaving(true)
    try {
      const messages: string[] = []
      if (nameChanged) {
        await updateUser({ name: trimmedName })
        messages.push('Your name was updated.')
      }
      if (emailChanged) {
        await changeEmail({ newEmail: trimmedEmail })
        messages.push(
          `A verification link was sent to ${trimmedEmail}. ` +
            `Your current email stays active until you verify the new one.`
        )
      }
      if (passwordChanged) {
        await changePassword({ currentPassword, newPassword })
        messages.push('Your password was updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
      Alert.alert('Saved', messages.join('\n\n'))
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to update profile'
      )
    } finally {
      setSaving(false)
    }
  }, [
    name,
    email,
    currentPassword,
    newPassword,
    confirmPassword,
    user,
  ])

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const allNotes = await getAllNotes()
      const notes = allNotes.map((n) => ({
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
        message: JSON.stringify(
          { exportedAt: new Date().toISOString(), notes },
          null,
          2
        ),
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
    setDeleting(true)
    try {
      await deleteUser({ password: deletePassword, callbackURL: '/' })
      await signOut()
    } catch (e) {
      // Keep the confirm state so a typo can be corrected without starting over.
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to delete account'
      )
    } finally {
      setDeleting(false)
    }
  }, [deletePassword, signOut])

  const updatedAtLabel = formatUpdatedAt(user?.updatedAt)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
      keyboardShouldPersistTaps="handled"
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
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Profile Header Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Pressable
            onPress={handlePickImage}
            style={styles.avatarContainer}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.accentLight },
                ]}
              >
                <ActivityIndicator color={theme.accent} />
              </View>
            ) : avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} />
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
              {avatarSource ? 'Change profile photo' : 'Add profile photo'}
            </Text>
          </Pressable>

          {avatarSource ? (
            <Pressable
              onPress={handleRemoveImage}
              disabled={uploadingImage}
              hitSlop={8}
              style={({ pressed }) => [
                styles.removePhotoBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.danger} />
              <Text style={[styles.removePhotoText, { color: theme.danger }]}>
                Remove photo
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.userName, { color: theme.text }]}>
            {user?.name || 'Unnamed'}
          </Text>
          {updatedAtLabel ? (
            <Text style={[styles.updatedAt, { color: theme.textSecondary }]}>
              Updated at: {updatedAtLabel}
            </Text>
          ) : null}
        </View>

        {/* Details Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Personal Details</Text>

          <View style={styles.field}>
            <TextInput
              style={[
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={name}
              label="Name"
              mode="outlined"
              onChangeText={(value) => {
                setName(value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={Boolean(errors.name)}
            />
            {errors.name ? (
              <Text style={[styles.fieldError, { color: theme.danger }]}>
                {errors.name}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <TextInput
              style={[
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={email}
              onChangeText={(value) => {
                setEmail(value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              error={Boolean(errors.email)}
            />
            {errors.email ? (
              <Text style={[styles.fieldError, { color: theme.danger }]}>
                {errors.email}
              </Text>
            ) : (
              <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
                Changing your email requires verifying the new address.
              </Text>
            )}
          </View>
        </View>

        {/* Password Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Security Settings</Text>

          <View style={styles.field}>
            <TextInput
              style={[
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              secureTextEntry
              label="Current Password"
              mode="outlined"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              style={[
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              label="New Password"
              mode="outlined"
              placeholderTextColor={theme.textSecondary}
              error={Boolean(errors.password)}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              style={[
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              label="Confirm Password"
              mode="outlined"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={Boolean(errors.password)}
            />
            {errors.password ? (
              <Text style={[styles.fieldError, { color: theme.danger }]}>
                {errors.password}
              </Text>
            ) : (
              <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
                Leave all three blank to keep your current password. 8-40 characters.
              </Text>
            )}
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
                      { color: selected ? theme.onAccent : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.saveRow}>
          <Pressable
            style={({ pressed }) => [
              styles.resetBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleReset}
            disabled={saving}
          >
            <Text style={[styles.saveBtnText, { color: theme.text }]}>Reset</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <Text style={[styles.saveBtnText, { color: theme.onAccent }]}>
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>

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
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
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
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Delete Account</Text>
                  )}
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
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  removePhotoText: { fontSize: 13, fontWeight: '600' },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  updatedAt: { fontSize: 12 },
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
  fieldError: { fontSize: 12 },
  fieldHint: { fontSize: 12 },
  themeOptionsRow: { flexDirection: 'row', gap: Spacing.two },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  themeOptionText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600' },
  saveRow: { flexDirection: 'row', gap: Spacing.two },
  resetBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    flex: 2,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
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
