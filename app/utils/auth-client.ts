import { createAuthClient } from "better-auth/react"

declare global {
  interface ImportMetaEnv {
    NEXT_PUBLIC_BETTER_AUTH_BASE_URL?: string
    NEXT_PUBLIC_BETTER_AUTH_BASE_PATH?: string
  }
}

const clientBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (import.meta.env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL || "http://localhost:3000")

export const authClient = createAuthClient({
  baseURL: clientBaseURL,
  basePath: import.meta.env.NEXT_PUBLIC_BETTER_AUTH_BASE_PATH || 'api/v1',
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  updateUser,
  deleteUser,
  changeEmail,
  changePassword,
  verifyEmail,
  requestPasswordReset
} = authClient

