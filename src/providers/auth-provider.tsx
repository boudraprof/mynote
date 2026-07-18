import {  createContext, useContext } from 'react'
import type {ReactNode} from 'react';
import { signOut as authSignOut, useSession } from '@/lib/auth'
// import * as SecureStore from 'expo-secure-store'

interface AuthContextValue {
  user: {
    id: string
    email: string
    name: string
    image?: string | null
  } | null
  isPending: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isPending: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }
    : null


  const handleSignOut = async () => {
    await authSignOut()
  }

  return (
    <AuthContext.Provider value={{ user, isPending, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
