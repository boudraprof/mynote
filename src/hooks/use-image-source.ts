import { useMemo } from 'react'
import type { ImageSource } from 'expo-image'

import { useSession } from '@/lib/auth'
import { toAbsoluteImageSrc } from '@/lib/image-url'

/**
 * Image source for a stored note/avatar image.
 *
 * The image proxy (`/api/v1/images/...`, `/uploads/...`) requires auth, but
 * React Native's `<Image>` has no cookie jar — the session cookie lives in
 * SecureStore. The server's `bearer()` plugin accepts the session token on
 * `Authorization`, so we attach it here.
 *
 * Must be rendered with `expo-image`'s `<Image>`: React Native's own `<Image>`
 * drops the `headers` on Android (verified on device — requests went out
 * unauthenticated and 401'd). `expo-image` sends them correctly.
 *
 * Returns `null` when there is no image, or while the session is still
 * hydrating — an unauthenticated request would 401 and could get cached by the
 * native image loader.
 */
export function useImageSource(
  src: string | null | undefined,
): ImageSource | null {
  const { data: session } = useSession()
  const uri = toAbsoluteImageSrc(src)
  const token = session?.session?.token

  return useMemo(() => {
    if (!uri || !token) return null
    return { uri, headers: { Authorization: `Bearer ${token}` } }
  }, [uri, token])
}
