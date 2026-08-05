import { useEffect, useState } from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false)

  // This is the canonical SSR hydration pattern: before the first client
  // render we report 'light' to avoid a mismatch, then flip to the real
  // value once mounted. The state can't be derived during render, so the
  // effect-driven flip is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true)
  }, [])

  const colorScheme = useRNColorScheme()

  if (hasHydrated) {
    return colorScheme
  }

  return 'light'
}
