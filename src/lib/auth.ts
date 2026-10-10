import { createAuthClient } from 'better-auth/react'
import { config } from './env'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

const client = createAuthClient({
  baseURL: config.apiUrl,
  basePath: config.apiBasePath,
  plugins: [
    expoClient({
      scheme: 'mynotes',
      storagePrefix: 'mynotes',
      storage: SecureStore,
    }),
  ],
})

export const authClient = client

export async function signInEmail(body: { email: string; password: string }) {
  const res = await client.signIn.email(body)
  if (res.error) {
    throw new BetterAuthError(res.error.message ?? 'Login failed')
  }
  return res.data
}

export async function signUpEmail(body: {
  email: string
  password: string
  name: string
}) {
  const res = await client.signUp.email(body)
  if (res.error) {
    throw new BetterAuthError(res.error.message ?? 'Signup failed')
  }
  return res.data
}

export async function signOut() {
  await client.signOut()
}

export function useSession() {
  return client.useSession()
}


export async function updateUser(data: {
  name?: string
  /** `null` removes the current image (server deletes the stored file). */
  image?: string | null
}) {
  const res = await client.updateUser(data)
  if (res.error) throw new BetterAuthError(res.error.message ?? 'Update failed')
  return res.data
}

export async function changeEmail(data: { newEmail: string }) {
  const res = await client.changeEmail(data)
  if (res.error)
    throw new BetterAuthError(res.error.message ?? 'Email change failed')
  return res.data
}

export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  const res = await client.changePassword(data)
  if (res.error)
    throw new BetterAuthError(res.error.message ?? 'Password change failed')
  return res.data
}

export async function deleteUser(data: {
  password: string
  callbackURL: string
}) {
  const res = await client.deleteUser(data)
  if (res.error) throw new BetterAuthError(res.error.message ?? 'Delete failed')
  return res.data
}

class BetterAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BetterAuthError'
  }
}
