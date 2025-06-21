'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@/lib/auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

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
    console.log("AuthProvider useEffect: Initializing auth state listener.");

    // Listen for auth changes, this is the primary source of truth for client-side session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth state changed!");
      console.log("Event:", event);
      console.log("Session:", session);

      if (session?.user) {
        try {
          // Get additional user data from accounts table
          const { data: accountData, error } = await supabase
            .from('accounts')
            .select('phone_number, name')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.warn('Error fetching account data:', error);
          }

          const currentUser: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            phone: session.user.phone || accountData?.phone_number || undefined,
            created_at: session.user.created_at || '',
            auth_method: session.user.phone || accountData?.phone_number ? 'phone' : 'email'
          }
          setUser(currentUser)
        } catch (error) {
          console.error('Error processing user data:', error);
          // Fallback to basic user data
          const currentUser: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            phone: session.user.phone || undefined,
            created_at: session.user.created_at || '',
            auth_method: session.user.email ? 'email' : 'phone'
          }
          setUser(currentUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false) // Always set loading to false once an event is received
    })

    return () => {
      console.log("AuthProvider: Cleaning up auth state listener.");
      subscription?.unsubscribe()
    }
  }, []) // Empty dependency array to run only once on mount

  useEffect(() => {
    console.log("AuthProvider: Redirect useEffect running. User:", user, "Loading:", loading, "Pathname:", pathname);
    // Redirect logic
    if (!loading) {
      const isProtectedRoute = pathname.startsWith('/portal')
      const isLoginPage = pathname === '/login'

      if (isProtectedRoute && !user) {
        console.log("AuthProvider: Redirecting unauthenticated user from protected route to /login");
        router.replace('/login')
      } else if (isLoginPage && user) {
        console.log("AuthProvider: Redirecting authenticated user from /login to /portal/dashboard");
        router.replace('/portal/dashboard')
      } else if (pathname === '/portal' && user) {
        console.log("AuthProvider: Redirecting authenticated user from /portal to /portal/dashboard");
        router.replace('/portal/dashboard')
      }
    }
  }, [user, loading, pathname, router])

  const handleSignOut = async () => {
    try {
      console.log("AuthProvider: Attempting to sign out.");
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error('Error signing out: ' + error.message)
      } else {
        toast.success('Signed out successfully')
        router.push('/')
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred: ' + error.message)
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