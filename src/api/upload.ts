import { readAsStringAsync } from 'expo-file-system/legacy'
import { isAxiosError } from 'axios'
import type { UploadResult } from './types'
import api from '@/lib/api'

export type UploadType = 'notes' | 'avatars' | 'drawings'

export interface UploadImageInput {
  uri: string
  name: string
  type: string
}

/**
 * Uploads an image to the server.
 *
 * React Native's `FormData` is NOT compatible with the web's multipart
 * implementation: there is no `File` object, the MIME type is frequently
 * missing/wrong (the server rejects `application/octet-stream`), and axios on
 * RN forces `Content-Type: multipart/form-data` without a boundary, which
 * breaks parsing. So instead of multipart, the file is read as base64 and
 * POSTed as JSON — the server's `/upload-image` endpoint accepts both formats
 * and detects the real MIME type from the file bytes.
 *
 * @param file      Local image descriptor from `expo-image-picker`.
 * @param uploadType Upload category: controls folder & size limits
 *                   (`notes` 10 MB, `avatars` 5 MB, `drawings` 5 MB).
 */
export async function uploadImage(
  file: UploadImageInput,
  uploadType: UploadType = 'notes',
): Promise<UploadResult> {
  try {
    const base64 = await readAsStringAsync(file.uri, { encoding: 'base64' })

    const { data } = await api.post<UploadResult>('/upload-image', {
      image: base64,
      type: uploadType,
      mimeType: file.type,
    })

    if (data.success === false) {
      return data
    }
    return data
  } catch (error) {
    let message = 'Failed to upload image'

    if (error instanceof TypeError) {
      message = 'Network error — check your connection and server URL'
    } else if (isAxiosError(error)) {
      // Surface the server's validation message (e.g. "File too large for avatars…")
      const serverMsg =
        error.response?.data?.errors ?? error.response?.data?.message
      if (typeof serverMsg === 'string') {
        message = serverMsg
      }
    }

    return { success: false, errors: message }
  }
}
