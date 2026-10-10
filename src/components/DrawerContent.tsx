import { Radius, Spacing } from '@/constants/theme'
import { useCreateLabel, useDeleteLabel, useLabels } from '@/hooks/use-labels'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/providers/auth-provider'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const NAV_ITEMS = [
  { name: 'notes', label: 'Notes', icon: 'file-document-outline', path: '/', tab: undefined },
  { name: 'reminders', label: 'Reminders', icon: 'bell-ring-outline', path: '/', tab: 'reminder' },
  { name: 'archive', label: 'Archive', icon: 'archive-outline', path: '/', tab: 'archived' },
  { name: 'trash', label: 'Trash', icon: 'trash-can-outline', path: '/', tab: 'trash' },
] as const

interface DrawerContentProps {
  state?: any
  navigation?: any
  descriptors?: any
}

export function DrawerContent(_props: DrawerContentProps) {
  
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const { data: labelsData } = useLabels()
  const createLabel = useCreateLabel()
  const deleteLabel = useDeleteLabel()
  const allLabels = labelsData?.data ?? []

  const [isEditingLabels, setIsEditingLabels] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')

  // Update the home screen's filter in place (rather than pushing a duplicate
  // home screen). Passing an explicit — possibly empty — tab/label lets the
  // home screen clear the active filter when "Notes" is tapped, so the user
  // can always get back from Trash/Archive/Reminders to the notes list.
  const handleNav = (_path: string, tab?: string) => {
    router.setParams({ tab: tab ?? '', label: '' } as any)
  }

  const handleLabelClick = (labelName: string) => {
    router.setParams({ tab: '', label: labelName } as any)
  }

  const handleAddLabel = () => {
    const name = newLabelName.trim()
    if (!name) return
    createLabel.mutate(name)
    setNewLabelName('')
  }

  const handleDeleteLabel = (id: string) => {
    deleteLabel.mutate(id)
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Image source={require('../../assets/logo128.png')} style={{ width: 24, height: 24 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Notes</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {NAV_ITEMS.map((item) => (
          <Pressable
            key={item.name}
            style={({ pressed }) => [
              styles.navItem,
              { backgroundColor: pressed ? theme.backgroundElement : 'transparent' },
            ]}
            onPress={() => handleNav(item.path, item.tab)}
          >
            <MaterialCommunityIcons name={item.icon as any} size={22} color={theme.text} style={styles.navIcon} />
            <Text style={[styles.navLabel, { color: theme.text }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Pressable
          style={({ pressed }) => [
            styles.navItem,
            { backgroundColor: pressed ? theme.backgroundElement : 'transparent' },
          ]}
          onPress={() => setIsEditingLabels((v) => !v)}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.text} style={styles.navIcon} />
          <Text style={[styles.navLabel, { color: theme.text }]}>
            Edit labels
          </Text>
          {isEditingLabels && (
            <Pressable
              onPress={() => setIsEditingLabels(false)}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </Pressable>

        {isEditingLabels && (
          <View style={styles.addLabelRow}>
            <TextInput
              style={[
                styles.labelInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              value={newLabelName}
              onChangeText={setNewLabelName}
              onSubmitEditing={handleAddLabel}
              placeholder="New label name"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              onPress={handleAddLabel}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.onAccent} />
            </Pressable>
          </View>
        )}

        {allLabels.map((label) => (
          <Pressable
            key={label.id}
            style={({ pressed }) => [
              styles.navItem,
              { backgroundColor: pressed ? theme.backgroundElement : 'transparent' },
            ]}
            onPress={() => handleLabelClick(label.name)}
          >
            <MaterialCommunityIcons name="tag" size={22} color={theme.text} style={styles.navIcon} />
            <Text
              style={[styles.navLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              {label.name}
            </Text>
            {isEditingLabels && (
              <Pressable
                onPress={() => handleDeleteLabel(label.id)}
                style={styles.deleteBtn}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.danger} />
              </Pressable>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer: user info + sign out */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={[styles.avatarText, { color: theme.onAccent }]}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.footerInfo}>
          <Text
            style={[styles.footerName, { color: theme.text }]}
            numberOfLines={1}
          >
            {user?.name || user?.email || 'Account'}
          </Text>
          {user?.email && (
            <Text
              style={[styles.footerEmail, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {user.email}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            signOut()
           router.navigate('/')
          }}
          style={({ pressed }) => [
            styles.signOutBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.signOutText, { color: theme.textSecondary }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },

  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: {
    flex: 1,
    paddingTop: Spacing.one,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    gap: Spacing.three,
  },
  navIcon: { width: 24, textAlign: 'center' as const },
  navLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  divider: { height: 1, marginVertical: Spacing.one, marginHorizontal: Spacing.four },
  closeBtn: { padding: 4 },
  addLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  labelInput: {
    flex: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 18, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '600' },
  footerInfo: { flex: 1 },
  footerName: { fontSize: 14, fontWeight: '600' },
  footerEmail: { fontSize: 12 },
  signOutBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  signOutText: { fontSize: 13, fontWeight: '500' },
})
