import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useNavigation, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ApiNote } from '@/api/types'
import {
  useCopyNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/hooks/use-notes'
import { pullServerNotes } from '@/hooks/use-sync'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/use-theme'
import { NoteCard } from '@/components/NoteCard'
import { LoadingView } from '@/components/LoadingView'
import { EmptyState } from '@/components/EmptyState'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import api from '@/lib/api'
import { useSession } from '@/lib/auth'



export default function HomeScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data: s, isPending } = useSession()
  const user = s?.user
  const params = useLocalSearchParams<{ tab?: string; label?: string }>()
  const [activeTab, setActiveTab] = useState<string | undefined>(
    params.tab || undefined,
  )
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(
    params.label || undefined,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')

  useEffect(() => {
    // Keep tab/label state in sync when the drawer navigates here with new
    // params (e.g. tapping "Trash" sets ?tab=trash).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional param sync
    if (params.tab) setActiveTab(params.tab)
    if (params.label) setSelectedLabel(params.label)
  }, [params.tab, params.label])
  const searchRef = useRef<TextInput>(null)

  const { data, isLoading, refetch, isRefetching } = useNotes(
    activeTab
      ? { field: activeTab }
      : selectedLabel
        ? { label: selectedLabel }
        : undefined,
  )
  const deleteNote = useDeleteNote()
  const copyNote = useCopyNote()
  const updateNote = useUpdateNote()

  const navigation = useNavigation()
  const rawNotes = data?.data ?? []
  const notesList = searchQuery
    ? rawNotes.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.content || '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : rawNotes

  const sortedNotes = useMemo(() => {
    const list = [...notesList]
    switch (sortBy) {
      case 'oldest':
        return list.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      case 'title':
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      case 'newest':
      default:
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    }
  }, [notesList, sortBy])

  // Split into pinned and unpinned if in active notes view
  const showPinnedSection = !activeTab && !selectedLabel && !searchQuery
  const pinnedNotes = showPinnedSection ? sortedNotes.filter((n) => n.pinned) : []
  const otherNotes = showPinnedSection
    ? sortedNotes.filter((n) => !n.pinned)
    : sortedNotes

  const handleEmptyTrash = useCallback(async () => {
    Alert.alert(
      'Empty Trash',
      'Are you sure you want to delete all notes in trash forever?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notes')
              refetch()
            } catch {
              Alert.alert('Error', 'Failed to empty trash')
            }
          },
        },
      ],
    )
  }, [refetch])

  const handleLongPress = useCallback(
    (note: ApiNote) => {
      const isTrash = note.StatusName === 'trash' || activeTab === 'trash'
      const isArchive =
        note.StatusName === 'archived' || activeTab === 'archived'

      const options: {
        text: string
        style?: 'destructive' | 'cancel'
        onPress: () => void
      }[] = [
        {
          text: 'Edit',
          onPress: () => router.push(`/note/${note.id}`),
        },
      ]

      if (isTrash) {
        options.push({
          text: 'Restore',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({
                id: note.id,
                statusName: 'active',
              })
            } catch {
              Alert.alert('Error', 'Failed to restore note')
            }
          },
        })
        options.push({
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote.mutateAsync(note.id)
            } catch {
              Alert.alert('Error', 'Failed to delete note')
            }
          },
        })
      } else if (isArchive) {
        options.push({
          text: 'Restore to Notes',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({
                id: note.id,
                statusName: 'active',
              })
            } catch {
              Alert.alert('Error', 'Failed to restore note')
            }
          },
        })
        options.push({
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({ id: note.id, statusName: 'trash' })
            } catch {
              Alert.alert('Error', 'Failed to trash note')
            }
          },
        })
      } else {
        options.push({
          text: note.pinned ? 'Unpin Note' : 'Pin Note',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({
                id: note.id,
                pinned: !note.pinned,
              })
            } catch {
              Alert.alert('Error', 'Failed to toggle pin')
            }
          },
        })
        options.push({
          text: 'Archive',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({
                id: note.id,
                statusName: 'archived',
              })
            } catch {
              Alert.alert('Error', 'Failed to archive note')
            }
          },
        })
        options.push({
          text: 'Copy',
          onPress: async () => {
            try {
              await copyNote.mutateAsync({
                title: note.title,
                content: note.content,
                checklist: note.checklist,
                checklistItems: note.checklistItems,
                palette: note.palette,
                image: note.image,
                labels: note.labels,
              })
            } catch {
              Alert.alert('Error', 'Failed to copy note')
            }
          },
        })
        options.push({
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateNote.mutateAsync({ id: note.id, statusName: 'trash' })
            } catch {
              Alert.alert('Error', 'Failed to delete note')
            }
          },
        })
      }

      options.push({ text: 'Cancel', style: 'cancel', onPress: () => {} })
      Alert.alert(note.title || 'Note Option', undefined, options)
    },
    [copyNote, deleteNote, updateNote, activeTab],
  )


  if (isPending) {
    return <LoadingView message="Loading Notes..." />
  }

  if (!user) {
    return (
      <View
        style={[styles.authContainer, { backgroundColor: theme.background }]}
      >
        <Image source={require('../../../assets/logo512.png')} style={{ width: 56, height: 56, marginBottom: Spacing.three }} />
        <Text style={[styles.authTitle, { color: theme.text }]}>
          My Notes
        </Text>
        <Text style={[styles.authSubtitle, { color: theme.textSecondary }]}>
          Sign in to access your notes
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.authButton,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            Shadow.md,
          ]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={[styles.authButtonText, { color: '#fff' }]}>
            Sign In
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            { opacity: pressed ? 0.6 : 1, marginTop: Spacing.four },
          ]}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={[styles.authLink, { color: theme.accent }]}>
            Create Account
          </Text>
        </Pressable>
      </View>
    )
  }

  type ListItem = { type: 'header'; title: string } | { type: 'note'; note: ApiNote }

  // Construct standard flat items list with custom headers
  const renderListItems = (): ListItem[] => {
    if (viewMode === 'grid') {
      return sortedNotes.map((n) => ({ type: 'note' as const, note: n }))
    }

    const listData: ListItem[] = []

    if (showPinnedSection && pinnedNotes.length > 0) {
      listData.push({ type: 'header', title: 'PINNED' })
      pinnedNotes.forEach((n) => listData.push({ type: 'note', note: n }))
      if (otherNotes.length > 0) {
        listData.push({ type: 'header', title: 'OTHERS' })
      }
    }

    otherNotes.forEach((n) => listData.push({ type: 'note', note: n }))
    return listData
  }

  const items = renderListItems()

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => (navigation as any).toggleDrawer()}>
            <Ionicons name="menu-outline" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerActionBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() =>
                setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))
              }
            >
              <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={20} color={theme.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerActionBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() =>
                setSortBy((prev) =>
                  prev === 'newest'
                    ? 'oldest'
                    : prev === 'oldest'
                      ? 'title'
                      : 'newest',
                )
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {sortBy === 'newest' ? (
                  <Ionicons name="arrow-down-outline" size={14} color={theme.textSecondary} />
                ) : sortBy === 'oldest' ? (
                  <Ionicons name="arrow-up-outline" size={14} color={theme.textSecondary} />
                ) : (
                  <Ionicons name="text-outline" size={14} color={theme.textSecondary} />
                )}
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Title'}
                </Text>
              </View>
            </Pressable>
          </View>
          <Pressable onPress={() => {
            router.navigate({pathname: "/profile"})
          }}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarText}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Search Input */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.surface },
            Shadow.sm,
          ]}
        >
          <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notes..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={(v) => {
              setSearchQuery(v)
              if (v.length > 0 && (activeTab || selectedLabel)) {
                setActiveTab(undefined)
                setSelectedLabel(undefined)
              }
            }}
            onSubmitEditing={() => router.push('/search')}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Empty Trash Button Row */}
        {activeTab === 'trash' && notesList.length > 0 && (
          <View style={styles.trashHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.emptyTrashBtn,
                {
                  backgroundColor: theme.accentLight,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleEmptyTrash}
            >
              <Text style={[styles.emptyTrashText, { color: theme.accent }]}>
                Empty Trash Now
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Main List */}
      {isLoading ? (
        <LoadingView />
      ) : notesList.length === 0 ? (
        <EmptyState
          icon={
            activeTab === 'archived'
              ? 'archive-outline'
              : activeTab === 'trash'
                ? 'trash-outline'
                : activeTab === 'reminder'
                  ? 'notifications-outline'
                  : 'document-text-outline'
          }
          title={
            searchQuery
              ? 'No results found'
              : activeTab === 'archived'
                ? 'No archived notes'
                : activeTab === 'trash'
                  ? 'Trash is empty'
                  : activeTab === 'reminder'
                    ? 'No reminders'
                    : selectedLabel
                      ? `No notes in "${selectedLabel}"`
                      : 'No notes yet'
          }
          subtitle={
            searchQuery
              ? 'Try a different search query'
              : activeTab
                ? undefined
                : 'Tap the + button to create a note'
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            item.type === 'note' ? item.note.id : `header-${index}`
          }
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={{
            paddingTop: Spacing.two,
            paddingBottom: insets.bottom + 100,
            marginHorizontal: viewMode !== 'grid' ? 10 : undefined
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={async () => {
                await pullServerNotes()
                refetch()
              }}
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text
                  style={[styles.sectionHeader, { color: theme.textSecondary }]}
                >
                  {item.title}
                </Text>
              )
            }
            return (
              <View
                style={viewMode === 'grid' ? styles.gridItem : undefined}
              >
                <NoteCard
                  note={item.note!}
                  onPress={() => router.push(`/note/${item.note!.id}`)}
                  onLongPress={() => handleLongPress(item.note!)}
                />
              </View>
            )
          }}
        />
      )}

      {/* Floating Action Button */}
      {!activeTab && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.85 : 1,
              bottom: insets.bottom + Spacing.four,
            },
            Shadow.md,
          ]}
          onPress={() => router.push('/note/create')}
        >
          <Ionicons name="add-outline" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1},
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },

  authTitle: { fontSize: 28, fontWeight: '700' },
  authSubtitle: {
    fontSize: 15,
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
    textAlign: 'center',
  },
  authButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    width: '80%',
  },
  authButtonText: { fontSize: 16, fontWeight: '600' },
  authLink: { fontSize: 15, fontWeight: '600' },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.one },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  headerActionBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  appTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13 },
  labelsFilterRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.two,
  },
  labelChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  trashHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTrashBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
  },
  emptyTrashText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: Spacing.four,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  gridRow: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  gridItem: {
    flex: 1,
    maxWidth: '50%',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
