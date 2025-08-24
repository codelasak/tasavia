'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { authDebug } from '@/lib/auth-debug'
import { connectionMonitor } from '@/lib/connection-monitor'

// Session storage utilities for caching user profile
const CACHE_KEY = 'tasavia_user_profile';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedUserProfile {
  user: User;
  timestamp: number;
  userId: string;
}

function getCachedProfile(userId: string): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedUserProfile = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is valid and for the correct user
    if (parsed.userId === userId && (now - parsed.timestamp) < CACHE_DURATION) {
      authDebug.info('profile', 'Using cached profile data', { userId });
      return parsed.user;
    } else {
      // Clear expired or mismatched cache
      sessionStorage.removeItem(CACHE_KEY);
      authDebug.debug('profile', 'Cache expired or user mismatch, cleared', { 
        cached: parsed.userId, 
        current: userId 
      });
    }
  } catch (error) {
    authDebug.warn('profile', 'Cache read error, clearing', error);
    sessionStorage.removeItem(CACHE_KEY);
  }
  
  return null;
}

function setCachedProfile(user: User): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cached: CachedUserProfile = {
      user,
      timestamp: Date.now(),
      userId: user.id
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    authDebug.debug('profile', 'Profile cached successfully', { userId: user.id });
  } catch (error) {
    authDebug.warn('profile', 'Cache write error', error);
  }
}

// Create basic user from session data immediately
function createBasicUserFromSession(session: any): User {
  return {
    id: session.user.id,
    email: session.user.email || undefined,
    phone: session.user.phone || undefined,
    created_at: session.user.created_at || '',
    auth_method: session.user.email ? 'email' : 'phone'
  };
}

// Enhanced profile fetching that doesn't block UI - runs in background
async function fetchUserProfileInBackground(
  session: any, 
  mountedRef: { current: boolean }, 
  onProfileUpdate: (user: User) => void,
  maxRetries = 3
): Promise<void> {
  if (!mountedRef.current) return;
  
  // Check cache first
  const cachedProfile = getCachedProfile(session.user.id);
  if (cachedProfile) {
    onProfileUpdate(cachedProfile);
    return;
  }
  
  const timerId = authDebug.startTimer('profile', 'fetchUserProfile');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (!mountedRef.current) {
      authDebug.debug('profile', 'Component unmounted, aborting profile fetch');
      return;
    }
    
    try {
      authDebug.debug('profile', `Fetching user profile - attempt ${attempt}/${maxRetries}`, 
        { userId: session?.user?.id }, session?.user?.id);
      
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
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        authDebug.warn('profile', 'Profile API request timeout');
      }, 10000); // 10 second timeout
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      authDebug.trackApiCall('/api/user/profile', response.status, duration, session.user.id);

      if (response.ok) {
        const result = await response.json();
        if (result.success && mountedRef.current) {
          authDebug.info('profile', 'Profile fetched successfully', { userId: session.user.id });
          authDebug.endTimer(timerId, 'Profile fetch');
          
          const enhancedUser: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            phone: session.user.phone || result.profile?.account?.phone_number || undefined,
            created_at: session.user.created_at || '',
            auth_method: session.user.phone || result.profile?.account?.phone_number ? 'phone' : 'email'
          };
          
          // Cache the enhanced profile data
          setCachedProfile(enhancedUser);
          
          onProfileUpdate(enhancedUser);
          return;
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
      const isTimeoutError = error.name === 'AbortError';
      const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
      const shouldRetry = isTimeoutError || isNetworkError || error.status >= 500;
      
      authDebug.error('profile', `Profile fetch attempt ${attempt} failed`, { 
        error: error.message,
        errorType: isTimeoutError ? 'timeout' : isNetworkError ? 'network' : 'api',
        attempt, 
        maxRetries,
        shouldRetry
      });
      
      if (attempt === maxRetries || !shouldRetry) {
        authDebug.warn('profile', 'Profile fetch failed permanently, keeping basic user data', {
          finalError: error.message,
          attempts: attempt
        });
        authDebug.endTimer(timerId, 'Profile fetch (failed)');
        return;
      }
      
      // Exponential backoff for next attempt, with jitter
      const baseDelay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
      const jitter = Math.random() * 200; // Add up to 200ms jitter
      const delay = baseDelay + jitter;
      
      authDebug.debug('profile', `Waiting ${Math.round(delay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  authDebug.endTimer(timerId, 'Profile fetch (failed)');
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
  const mountedRef = useRef(true)
  const lastUserIdRef = useRef<string | null>(null)

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

  // Memoized profile update handler to prevent unnecessary re-renders
  const handleProfileUpdate = useCallback((updatedUser: User) => {
    if (mountedRef.current) {
      setUser(updatedUser);
      authDebug.info('auth', 'User profile updated in background', { userId: updatedUser.id });
    }
  }, []); // Empty dependency array - this function doesn't need to change

  // Initial session hydration - sync with server state
  useEffect(() => {
    authDebug.info('auth', 'Starting initial session hydration');
    
    const hydrateInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          authDebug.error('auth', 'Initial session fetch failed', error);
          setError('Failed to initialize authentication');
          setLoading(false);
          return;
        }

        if (session?.user) {
          authDebug.info('auth', 'Initial session found, hydrating user state');
          
          // Check for cached profile data first
          const cachedProfile = getCachedProfile(session.user.id);
          if (cachedProfile) {
            authDebug.info('auth', 'Using cached profile for initial hydration');
            setUser(cachedProfile);
            setLoading(false);
            lastUserIdRef.current = session.user.id;
            return;
          }
          
          // Set basic user immediately for fast UI rendering
          const basicUser = createBasicUserFromSession(session);
          setUser(basicUser);
          setLoading(false);
          lastUserIdRef.current = session.user.id;
          
          // Enhance with profile data in background
          fetchUserProfileInBackground(session, mountedRef, handleProfileUpdate)
            .catch(error => {
              authDebug.error('auth', 'Initial profile fetch failed', error);
            });
        } else {
          authDebug.info('auth', 'No initial session found');
          setUser(null);
          setLoading(false);
        }
      } catch (error: any) {
        authDebug.error('auth', 'Session hydration error', error);
        setError('Authentication initialization failed');
        setLoading(false);
      }
    };

    hydrateInitialSession();
  }, []); // Empty dependencies - should only run on mount

  useEffect(() => {
    authDebug.info('auth', 'Initializing auth state listener');

    // Listen for auth changes, this is the primary source of truth for client-side session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      authDebug.trackAuthState(event, session, session?.user);

      // Prevent race conditions by checking if component is still mounted
      if (!mountedRef.current) return;

      // Clear any previous errors on auth state change
      setError(null);

      if (session?.user) {
        // Prevent unnecessary processing if it's the same user and not a fresh sign in
        if (lastUserIdRef.current === session.user.id && event !== 'SIGNED_IN') {
          authDebug.debug('auth', 'Same user, skipping processing', { userId: session.user.id });
          setLoading(false);
          return;
        }

        lastUserIdRef.current = session.user.id;

        // Set basic user data immediately to show UI
        const basicUser = createBasicUserFromSession(session);
        setUser(basicUser);
        setLoading(false); // Critical: Set loading false immediately
        
        authDebug.info('auth', 'Basic user data set immediately', { userId: basicUser.id });

        // Fetch enhanced profile data in background (non-blocking)
        fetchUserProfileInBackground(session, mountedRef, handleProfileUpdate)
          .catch(error => {
            authDebug.error('auth', 'Background profile fetch failed', error);
            // Don't set error state here - user can still use the app with basic data
          });
      } else {
        lastUserIdRef.current = null;
        setUser(null);
        setLoading(false);
        authDebug.info('auth', 'User signed out');
      }
    });

    return () => {
      authDebug.info('auth', 'Cleaning up auth state listener');
      subscription?.unsubscribe();
    }
  }, []) // Empty dependencies - effect should only run once

  // Separate cleanup effect for mounted ref to handle hot reload properly
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        // Set basic user data immediately
        const basicUser = createBasicUserFromSession(session);
        setUser(basicUser);
        setLoading(false);
        
        // Fetch enhanced profile in background
        fetchUserProfileInBackground(session, mountedRef, handleProfileUpdate)
          .catch(error => {
            authDebug.error('auth', 'Retry profile fetch failed', error);
          });
        
        console.log("AuthProvider: Auth retry successful");
      } else {
        setUser(null);
        setLoading(false);
        console.log("AuthProvider: No session found during retry");
      }
    } catch (error: any) {
      console.error("AuthProvider: Auth retry failed:", error);
      setError(error?.message || 'Authentication retry failed');
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