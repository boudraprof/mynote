import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DRAFT_KEY = 'note_draft'

interface Draft {
  title: string
  content: string
}

async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

async function clearDraft() {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY)
  } catch {}
}

export function useDraft() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<Draft | null>(null)

  useEffect(() => {
    loadDraft().then(setDraft)
  }, [])

  const save = useCallback((title: string, content: string) => {
    latestRef.current = { title, content }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          DRAFT_KEY,
          JSON.stringify(latestRef.current),
        )
      } catch {}
    }, 1000)
  }, [])

  const clear = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await clearDraft()
    setDraft(null)
    latestRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (latestRef.current) {
          AsyncStorage.setItem(
            DRAFT_KEY,
            JSON.stringify(latestRef.current),
          ).catch(() => {})
        }
      }
    }
  }, [])

  return { draft, save, clear }
}
