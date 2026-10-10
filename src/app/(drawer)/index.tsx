import { Image as ExpoImage } from 'expo-image'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import {
  ActivityIndicator,
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
import { Menu } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ApiNote } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { LoadingView } from '@/components/LoadingView'
import { NoteCard } from '@/components/NoteCard'
import { PaletteDialog } from '@/components/PaletteDialog'
import { ReminderSheet } from '@/components/ReminderSheet'
import { Radius, Shadow, Spacing } from '@/constants/theme'
import { useImageSource } from '@/hooks/use-image-source'
import {
  useCopyNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/hooks/use-notes'
import { pullServerNotes, syncPendingNotes, useSyncStatus } from '@/hooks/use-sync'
import { useTheme } from '@/hooks/use-theme'
import api from '@/lib/api'
import { useSession } from '@/lib/auth'
import { exportNotesToShare } from '@/lib/export-import'
import {
  cancelReminder,
  syncReminderNotification,
} from '@/lib/notifications'
import { MaterialCommunityIcons } from '@expo/vector-icons'



export default function HomeScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data: s, isPending } = useSession()
  const user = s?.user
  const avatarSource = useImageSource(user?.image ?? '')
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false)
  const [paletteNote, setPaletteNote] = useState<{
    noteId: string
    currentPalette: string | null
  } | null>(null)
  const [reminderNote, setReminderNote] = useState<{
    noteId: string
    title: string | null
    currentReminder: string | null
  } | null>(null)
  const selectionMode = selectedIds.length > 0

  useEffect(() => {
    // Keep tab/label state in sync when the drawer navigates here with new
    // params (e.g. tapping "Trash" sets ?tab=trash). Assign unconditionally so
    // tapping "Notes" (empty tab) clears the active filter and returns to the
    // notes list instead of leaving the previous view stuck.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional param sync
    setActiveTab(params.tab || undefined)
    setSelectedLabel(params.label || undefined)
    // Exit selection mode whenever the view changes.
    setSelectedIds([])
    setSelectionMenuOpen(false)
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
  const sync = useSyncStatus()

  const navigation = useNavigation()
  const rawNotes = useMemo(() => data?.data ?? [], [data])
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

  const selectedNotes = useMemo(
    () => sortedNotes.filter((n) => selectedIds.includes(n.id)),
    [sortedNotes, selectedIds],
  )

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
              // The notes are gone for good — drop any pending reminders.
              await Promise.all(rawNotes.map((note) => cancelReminder(note.id)))
              refetch()
            } catch {
              Alert.alert('Error', 'Failed to empty trash')
            }
          },
        },
      ],
    )
  }, [refetch, rawNotes])

  const toggleSelect = useCallback((note: ApiNote) => {
    setSelectedIds((prev) =>
      prev.includes(note.id)
        ? prev.filter((id) => id !== note.id)
        : [...prev, note.id],
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectionMenuOpen(false)
  }, [])

  const handleLongPress = useCallback((note: ApiNote) => {
    // Long-press enters selection mode (Keep-style), replacing the old Alert menu.
    setSelectedIds([note.id])
  }, [])

  const runForSelected = useCallback(
    async (action: (note: ApiNote) => Promise<unknown>, errorMsg: string) => {
      try {
        for (const note of selectedNotes) {
          await action(note)
        }
        clearSelection()
      } catch {
        Alert.alert('Error', errorMsg)
      }
    },
    [selectedNotes, clearSelection],
  )

  const pinSelected = useCallback(() => {
    const shouldPin = selectedNotes.some((n) => !n.pinned)
    void runForSelected(
      (note) => updateNote.mutateAsync({ id: note.id, pinned: shouldPin }),
      'Failed to update pin',
    )
  }, [selectedNotes, runForSelected, updateNote])

  const copySelected = useCallback(() => {
    void runForSelected(
      (note) =>
        copyNote.mutateAsync({
          title: note.title,
          content: note.content,
          checklist: note.checklist,
          checklistItems: note.checklistItems,
          palette: note.palette,
          image: note.image,
          labels: note.labels,
        }),
      'Failed to copy note',
    )
  }, [runForSelected, copyNote])

  const archiveSelected = useCallback(() => {
    void runForSelected(
      (note) => updateNote.mutateAsync({ id: note.id, statusName: 'archived' }),
      'Failed to archive note',
    )
  }, [runForSelected, updateNote])

  const trashSelected = useCallback(() => {
    void runForSelected(
      async (note) => {
        await updateNote.mutateAsync({ id: note.id, statusName: 'trash' })
        await cancelReminder(note.id)
      },
      'Failed to move note to trash',
    )
  }, [runForSelected, updateNote])

  const restoreSelected = useCallback(() => {
    void runForSelected(
      (note) => updateNote.mutateAsync({ id: note.id, statusName: 'active' }),
      'Failed to restore note',
    )
  }, [runForSelected, updateNote])

  const deleteForeverSelected = useCallback(() => {
    Alert.alert(
      'Delete forever',
      'Are you sure you want to delete the selected notes permanently? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void runForSelected(
              async (note) => {
                await deleteNote.mutateAsync(note.id)
                await cancelReminder(note.id)
              },
              'Failed to delete note'
            )
          },
        },
      ]
    )
  }, [runForSelected, deleteNote])

  const editSelected = useCallback(() => {
    if (selectedNotes.length !== 1) return
    const note = selectedNotes[0]
    clearSelection()
    router.push(`/note/${note.id}`)
  }, [selectedNotes, clearSelection])

  const shareSelected = useCallback(async () => {
    try {
      const shared = await exportNotesToShare(selectedNotes)
      if (!shared) {
        Alert.alert('Share', 'Sharing is not available on this device')
      }
    } catch {
      Alert.alert('Share', 'Failed to share note')
    } finally {
      clearSelection()
    }
  }, [selectedNotes, clearSelection])

  const reminderSelected = useCallback(() => {
    if (selectedNotes.length !== 1) {
      Alert.alert('Reminder', 'Select a single note to set a reminder')
      return
    }
    const note = selectedNotes[0]
    setReminderNote({
      noteId: note.id,
      title: note.title,
      currentReminder: note.reminderAt ?? null,
    })
    clearSelection()
  }, [selectedNotes, clearSelection])

  const paletteSelected = useCallback(() => {
    if (selectedNotes.length !== 1) {
      Alert.alert('Palette', 'Select a single note to set a palette')
      return
    }
    const note = selectedNotes[0]
    setPaletteNote({ noteId: note.id, currentPalette: note.palette ?? null })
    clearSelection()
  }, [selectedNotes, clearSelection])

  const saveReminder = useCallback(
    async (reminderAt: string | null) => {
      if (!reminderNote) return
      try {
        await updateNote.mutateAsync({ id: reminderNote.noteId, reminderAt })
        // Keep the OS notification in sync with the stored reminder.
        const granted = await syncReminderNotification(
          reminderNote.noteId,
          reminderNote.title,
          reminderAt,
        )
        if (reminderAt && !granted) {
          Alert.alert(
            'Reminder saved',
            'Notifications are disabled for this app. Enable them in your device settings to get reminded.',
          )
        }
      } catch {
        Alert.alert('Reminder', 'Failed to update reminder')
      }
    },
    [updateNote, reminderNote],
  )

  const savePalette = useCallback(
    async (palette: string | null) => {
      if (!paletteNote) return
      try {
        await updateNote.mutateAsync({ id: paletteNote.noteId, palette })
      } catch {
        Alert.alert('Palette', 'Failed to update palette')
      }
    },
    [updateNote, paletteNote],
  )

  type ToolbarAction = {
    icon: ComponentProps<typeof MaterialCommunityIcons>['name']
    label: string
    color?: string
    onPress: () => void
  }

  const isTrashView = activeTab === 'trash'
  const isArchiveView = activeTab === 'archived'
  const allPinned =
    selectedNotes.length > 0 && selectedNotes.every((n) => n.pinned)

  const toolbarButtons: ToolbarAction[] = isTrashView
    ? [
      {
        icon: 'restore',
        label: 'Restore',
        onPress: restoreSelected,
      },

    ]
    : isArchiveView
      ? [
        {
          icon: 'restore',
          label: 'Restore',
          onPress: restoreSelected,
        },
        { icon: 'content-copy', label: 'Copy', onPress: copySelected },
        {
          icon: 'palette-outline',
          label: 'Palette',
          onPress: paletteSelected,
        },
        {
          icon: 'bell-ring-outline',
          label: 'Reminder',
          onPress: reminderSelected,
        },

        {
          icon: 'trash-can-outline',
          label: 'Move to trash',
          color: theme.danger,
          onPress: trashSelected,
        },
      ]
      : [
        {
          icon: allPinned ? 'pin-off' : 'pin',
          label: allPinned ? 'Unpin' : 'Pin',
          onPress: pinSelected,
        },
        { icon: 'content-copy', label: 'Copy', onPress: copySelected },

        {
          icon: 'palette-outline',
          label: 'Palette',
          onPress: paletteSelected,
        },
        {
          icon: 'share-variant-outline',
          label: 'Share',
          onPress: shareSelected,
        },
        { icon: 'archive-outline', label: 'Archive', onPress: archiveSelected },

      ]

  const menuItems: ToolbarAction[] = useMemo(() => {
    if (selectedNotes.length !== 1) return []
    return isTrashView ? [{
      icon: 'trash-can-outline',
      label: 'Delete forever',
      color: theme.danger,
      onPress: deleteForeverSelected,
    }] : [
      {
        icon: 'pencil-outline',
        label: 'Edit',
        onPress: editSelected,
      },
      {
        icon: 'bell-ring-outline',
        label: 'Reminder',
        onPress: reminderSelected,
      },
      {
        icon: 'palette-outline',
        label: 'Palette',
        onPress: paletteSelected,
      },
      {
        icon: 'trash-can-outline',
        label: 'Move to trash',
        color: theme.danger,
        onPress: trashSelected,
      },
    ]
  }, [selectedNotes, editSelected, reminderSelected, paletteSelected])


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
          <Text style={[styles.authButtonText, { color: theme.onAccent }]}>
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
        {selectionMode ? (
          <View style={styles.selectionBar}>
            <Pressable
              onPress={clearSelection}
              hitSlop={8}
              style={({ pressed }) => [
                styles.selectionActionBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text
              style={[styles.selectionCount, { color: theme.text }]}
              numberOfLines={1}
            >
              {selectedIds.length} selected
            </Text>
            <View style={styles.selectionActions}>
              {toolbarButtons.map((btn) => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.selectionActionBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <MaterialCommunityIcons name={btn.icon} size={20} color={theme.text} />
                </Pressable>
              ))}
              {menuItems.length > 0 && (
                <Menu
                  visible={selectionMenuOpen}
                  onDismiss={() => setSelectionMenuOpen(false)}
                  anchor={
                    <Pressable
                      onPress={() => setSelectionMenuOpen((o) => !o)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.selectionActionBtn,
                        { opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="dots-vertical"
                        size={20}
                        color={theme.text}
                      />
                    </Pressable>
                  }
                >
                  {menuItems.map((item) => (
                    <Menu.Item
                      key={item.label}
                      leadingIcon={({ size, color }) => (
                        <MaterialCommunityIcons name={item.icon} size={size} color={color} />
                      )}
                      title={item.label}
                      onPress={() => {
                        setSelectionMenuOpen(false)
                        item.onPress()
                      }}
                    />
                  ))}
                </Menu>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Pressable onPress={() => (navigation as any).toggleDrawer()}>
                <MaterialCommunityIcons name="menu" size={24} color={theme.text} />
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
                  <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'} size={20} color={theme.text} />
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
                      <MaterialCommunityIcons name="arrow-down-thin" size={14} color={theme.textSecondary} />
                    ) : sortBy === 'oldest' ? (
                      <MaterialCommunityIcons name="arrow-up-thin" size={14} color={theme.textSecondary} />
                    ) : (
                      <MaterialCommunityIcons name="text" size={14} color={theme.textSecondary} />
                    )}
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Title'}
                    </Text>
                  </View>
                </Pressable>
              </View>
              <Pressable onPress={() => {
                router.navigate({ pathname: "/profile" })
              }}>
                <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                  {avatarSource ? (
                    <ExpoImage
                      source={avatarSource}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <Text style={[styles.avatarText, { color: theme.onAccent }]}>
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </Text>
                  )}
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
              <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
              <TextInput
                ref={searchRef}
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search  notes..."
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
                  <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Pending sync banner */}
            {(sync.pending > 0 || sync.syncing) && (
              <View
                style={[
                  styles.syncBanner,
                  {
                    backgroundColor: sync.syncing
                      ? theme.accentLight
                      : theme.backgroundSelected,
                  },
                ]}
              >
                {sync.syncing ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <MaterialCommunityIcons
                    name="cloud-upload-outline"
                    size={14}
                    color={theme.textSecondary}
                  />
                )}
                <Text
                  style={[styles.syncBannerText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {sync.syncing
                    ? `Syncing ${sync.pending} change${sync.pending === 1 ? '' : 's'}…`
                    : sync.retryInMs > 0
                      ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting — retrying in ${Math.ceil(sync.retryInMs / 1000)}s`
                      : `${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to sync`}
                </Text>
                {!sync.syncing && (
                  <Pressable onPress={() => void syncPendingNotes()} hitSlop={8}>
                    <Text style={[styles.syncBannerAction, { color: theme.accent }]}>
                      Sync now
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

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
          </>
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
                ? 'trash-can-outline'
                : activeTab === 'reminder'
                  ? 'bell-ring-outline'
                  : 'file-document-outline'
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
          extraData={selectedIds}
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
                // Server pull needs a session; skip silently when logged out.
                if (user) {
                  await pullServerNotes()
                }
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
                  selected={selectedIds.includes(item.note!.id)}
                  onPress={() => {
                    if (selectionMode) {
                      toggleSelect(item.note!)
                    } else {
                      router.push(`/note/${item.note!.id}`)
                    }
                  }}
                  onLongPress={() => handleLongPress(item.note!)}
                />
              </View>
            )
          }}
        />
      )}

      {/* Floating Action Button */}
      {!activeTab && !selectionMode && (
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
          <MaterialCommunityIcons name="plus" size={28} color={theme.onAccent} />

        </Pressable>
      )}

      <ReminderSheet
        visible={reminderNote !== null}
        currentReminder={reminderNote?.currentReminder ?? null}
        onSave={saveReminder}
        onClose={() => setReminderNote(null)}
      />

      <PaletteDialog
        visible={paletteNote !== null}
        currentPalette={paletteNote?.currentPalette ?? null}
        onSave={savePalette}
        onClose={() => setPaletteNote(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  selectionActionBtn: {
    padding: Spacing.half,
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
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  syncBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  syncBannerAction: {
    fontSize: 13,
    fontWeight: '700',
  },
})
