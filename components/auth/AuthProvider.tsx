'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth, User } from '@/lib/auth'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      try {
        const currentUser = await auth.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error getting initial user:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Redirect logic
    if (!loading) {
      const isProtectedRoute = pathname.startsWith('/portal/dashboard')
      const isPortalRoute = pathname === '/portal'

      if (isProtectedRoute && !user) {
        // User is not authenticated and trying to access protected route
        router.push('/portal')
      } else if (isPortalRoute && user) {
        // User is authenticated and on login page, redirect to dashboard
        router.push('/portal/dashboard')
      }
    }
  }, [user, loading, pathname, router])

  const handleSignOut = async () => {
    try {
      const { error } = await auth.signOut()
      if (error) {
        toast.error('Error signing out: ' + error)
      } else {
        toast.success('Signed out successfully')
        router.push('/')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}