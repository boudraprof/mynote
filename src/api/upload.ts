import { authClient } from '@/lib/auth'
import type { UploadResult } from './types'
import { config } from '@/lib/env'

export async function uploadImage(file: {
  uri: string
  name: string
  type: string
}): Promise<UploadResult> {
  const formData = new FormData()
  // React Native FormData requires a file descriptor object (not a Blob)
  // for native file uploads.
  formData.append('image', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any)

  try {
    const cookie = authClient.getCookie()
    if (!cookie) {
      return { success: false, errors: 'Authentication required. Please sign in again.' }
    }

    const res = await fetch(`${config.apiBaseUrl}/upload-image`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
      },
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, errors: data.errors || data.message || data.error || 'Upload failed' }
    }
    return data
  } catch (error) {
    const message =
      error instanceof TypeError
        ? 'Network error — check your connection and server URL'
        : 'Failed to upload image'
    return { success: false, errors: message }
  }
}
