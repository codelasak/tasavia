'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { authDebug } from '@/lib/auth-debug'
import { connectionMonitor } from '@/lib/connection-monitor'

// Enhanced profile fetching with retry mechanism and error recovery
async function fetchUserProfileWithRetry(session: any, isMounted: boolean, maxRetries = 3): Promise<User | null> {
  const timerId = authDebug.startTimer('profile', 'fetchUserProfile');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      authDebug.debug('profile', `Fetching user profile - attempt ${attempt}/${maxRetries}`, 
        { userId: session?.user?.id }, session?.user?.id);
      
      // Add small delay before first API call to ensure token is properly set
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check if session is still valid before making API call
      if (!session?.access_token) {
        authDebug.error('profile', 'No access token available for profile fetch');
        throw new Error('No access token available');
      }

      // Refresh session if this is a retry attempt
      if (attempt > 1) {
        authDebug.info('profile', 'Refreshing session before retry', { attempt });
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          authDebug.error('profile', 'Session refresh failed', refreshError);
          throw refreshError;
        }
        if (refreshData.session) {
          session = refreshData.session;
          authDebug.info('profile', 'Session refreshed successfully');
        }
      }

      const startTime = Date.now();
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - startTime;

      authDebug.trackApiCall('/api/user/profile', response.status, duration, session.user.id);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          authDebug.info('profile', 'Profile fetched successfully', { userId: session.user.id });
          authDebug.endTimer(timerId, 'Profile fetch');
          return {
            id: session.user.id,
            email: session.user.email || undefined,
            phone: session.user.phone || result.profile?.account?.phone_number || undefined,
            created_at: session.user.created_at || '',
            auth_method: session.user.phone || result.profile?.account?.phone_number ? 'phone' : 'email'
          };
        } else {
          throw new Error(result.error || 'Profile fetch failed');
        }
      } else if (response.status === 401 && attempt < maxRetries) {
        authDebug.warn('profile', `Profile API returned 401, retrying...`, { attempt, maxRetries });
        // Exponential backoff: 500ms, 1s, 2s
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        throw new Error(`Profile API error: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      authDebug.error('profile', `Profile fetch attempt ${attempt} failed`, { 
        error: error.message, 
        attempt, 
        maxRetries 
      });
      
      if (attempt === maxRetries) {
        authDebug.warn('profile', 'All profile fetch attempts failed, falling back to basic user data');
        authDebug.endTimer(timerId, 'Profile fetch (with fallback)');
        // Return basic user data as fallback
        return {
          id: session.user.id,
          email: session.user.email || undefined,
          phone: session.user.phone || undefined,
          created_at: session.user.created_at || '',
          auth_method: session.user.email ? 'email' : 'phone'
        };
      }
      
      // Exponential backoff for next attempt
      const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
      authDebug.debug('profile', `Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  authDebug.endTimer(timerId, 'Profile fetch (failed)');
  return null;
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  clearError: () => void
  retryAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  clearError: () => {},
  retryAuth: async () => {},
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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Initialize connection monitoring
  useEffect(() => {
    authDebug.info('auth', 'Initializing connection monitoring');
    
    const unsubscribe = connectionMonitor.addListener((status) => {
      authDebug.info('auth', `Connection status changed: ${status}`);
      
      if (status === 'offline') {
        toast.error('Network connection lost. Some features may not work properly.');
      } else if (status === 'online') {
        toast.success('Network connection restored.');
      } else if (status === 'unstable') {
        toast.warning('Network connection is unstable. Please check your internet connection.');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    authDebug.info('auth', 'Initializing auth state listener');

    let isMounted = true;
    let lastUserId: string | null = null;

    // Listen for auth changes, this is the primary source of truth for client-side session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      authDebug.trackAuthState(event, session, session?.user);

      // Prevent race conditions by checking if component is still mounted
      if (!isMounted) return;

      // Clear any previous errors on auth state change
      if (isMounted) {
        setError(null);
      }

      if (session?.user) {
        // Prevent unnecessary API calls if it's the same user
        if (lastUserId === session.user.id && event !== 'SIGNED_IN') {
          authDebug.debug('auth', 'Same user, skipping account data fetch', { userId: session.user.id });
          setLoading(false);
          return;
        }

        lastUserId = session.user.id;

        try {
          // Enhanced profile fetching with retry mechanism and token refresh
          const currentUser = await fetchUserProfileWithRetry(session, isMounted);
          if (currentUser && isMounted) {
            setUser(currentUser);
            authDebug.info('auth', 'User profile loaded successfully', { userId: currentUser.id });
          }
        } catch (error: any) {
          authDebug.error('auth', 'Error fetching user profile', error);
          const errorMessage = error?.message || 'Failed to load user profile';
          
          if (isMounted) {
            setError(errorMessage);
            // Fallback to basic user data even with error
            const currentUser: User = {
              id: session.user.id,
              email: session.user.email || undefined,
              phone: session.user.phone || undefined,
              created_at: session.user.created_at || '',
              auth_method: session.user.email ? 'email' : 'phone'
            };
            setUser(currentUser);
            authDebug.warn('auth', 'Using fallback user data due to profile fetch error', { userId: session.user.id });
          }
        }
      } else {
        lastUserId = null;
        if (isMounted) {
          setUser(null);
          authDebug.info('auth', 'User signed out');
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    })

    return () => {
      authDebug.info('auth', 'Cleaning up auth state listener');
      isMounted = false;
      subscription?.unsubscribe()
    }
  }, []) // Empty dependency array to run only once on mount

  // Note: Redirect logic has been moved to middleware.ts for better performance and reliability

  const clearError = () => {
    setError(null);
  };

  const retryAuth = async () => {
    console.log("AuthProvider: Retrying authentication...");
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      
      if (session?.user) {
        const currentUser = await fetchUserProfileWithRetry(session, true);
        if (currentUser) {
          setUser(currentUser);
          console.log("AuthProvider: Auth retry successful");
        }
      } else {
        setUser(null);
        console.log("AuthProvider: No session found during retry");
      }
    } catch (error: any) {
      console.error("AuthProvider: Auth retry failed:", error);
      setError(error?.message || 'Authentication retry failed');
    } finally {
      setLoading(false);
    }
  };

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
        error,
        signOut: handleSignOut,
        clearError,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}