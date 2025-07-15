'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => {
    console.log("AuthProvider useEffect: Initializing auth state listener.");

    let isMounted = true;
    let lastUserId: string | null = null;

    // Listen for auth changes, this is the primary source of truth for client-side session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth state changed!");
      console.log("Event:", event);
      console.log("Session:", session);

      // Prevent race conditions by checking if component is still mounted
      if (!isMounted) return;

      if (session?.user) {
        // Prevent unnecessary API calls if it's the same user
        if (lastUserId === session.user.id && event !== 'SIGNED_IN') {
          console.log("AuthProvider: Same user, skipping account data fetch");
          setLoading(false);
          return;
        }

        lastUserId = session.user.id;

        try {
          // Use API route for better error handling and consistency
          const response = await fetch('/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && isMounted) {
              const currentUser: User = {
                id: session.user.id,
                email: session.user.email || undefined,
                phone: session.user.phone || result.profile?.account?.phone_number || undefined,
                created_at: session.user.created_at || '',
                auth_method: session.user.phone || result.profile?.account?.phone_number ? 'phone' : 'email'
              };
              setUser(currentUser);
            }
          } else {
            // Fallback to basic user data if API call fails
            if (isMounted) {
              const currentUser: User = {
                id: session.user.id,
                email: session.user.email || undefined,
                phone: session.user.phone || undefined,
                created_at: session.user.created_at || '',
                auth_method: session.user.email ? 'email' : 'phone'
              };
              setUser(currentUser);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to basic user data
          if (isMounted) {
            const currentUser: User = {
              id: session.user.id,
              email: session.user.email || undefined,
              phone: session.user.phone || undefined,
              created_at: session.user.created_at || '',
              auth_method: session.user.email ? 'email' : 'phone'
            };
            setUser(currentUser);
          }
        }
      } else {
        lastUserId = null;
        if (isMounted) {
          setUser(null);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    })

    return () => {
      console.log("AuthProvider: Cleaning up auth state listener.");
      isMounted = false;
      subscription?.unsubscribe()
    }
  }, []) // Empty dependency array to run only once on mount

  // Note: Redirect logic has been moved to middleware.ts for better performance and reliability

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
    } catch (error) {
      toast.error('An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'))
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