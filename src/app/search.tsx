import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDebounce } from '@/hooks/use-debounce'

import { useSearch } from '@/hooks/use-search'
import { useTheme } from '@/hooks/use-theme'
import { NoteCard } from '@/components/NoteCard'
import { EmptyState } from '@/components/EmptyState'
import { Ionicons } from '@expo/vector-icons'
import { Spacing } from '@/constants/theme'

export default function SearchScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, 300)
  const inputRef = useRef<TextInput>(null)

  const { data, isLoading } = useSearch({ q: debouncedQuery })

  const results = data?.data ?? []

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.searchRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
              },
            ]}
            placeholder="Search notes..."
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>
      </View>

      {isLoading && debouncedQuery ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : results.length === 0 && debouncedQuery ? (
        <EmptyState
          icon="search-outline"
          title="No results found"
          subtitle="Try a different search term"
        />
      ) : !debouncedQuery ? (
        <EmptyState
          icon="search-outline"
          title="Search your notes"
          subtitle="Type to search across all your notes"
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: Spacing.two,
            paddingBottom: insets.bottom + Spacing.six,
          }}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => router.push(`/note/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { fontSize: 24 },

  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
})
