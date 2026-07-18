import { useSession } from '@/lib/auth'
import type { UploadResult } from './types'
import { config } from '@/lib/env'
// import { secureStorage } from '@/lib/storage'

export async function uploadImage(file: {
  uri: string
  name: string
  type: string
}): Promise<UploadResult> {

  const {data} = useSession()
  const formData = new FormData()
  formData.append('image', file as unknown as Blob)
 try {
   const res = await fetch(`${config.apiBaseUrl}/upload-image`, {
     method: 'POST',
     headers:  { Authorization: `Bearer ${data?.session.token}`},
     body: formData,
   })
     return res.json()
 } catch (error) {
    return {success: false, message: 'field to upload Image'}
 }
}
