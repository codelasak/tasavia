'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  
  console.log("ProtectedRoute render: User state:", user, "Loading state:", loading);

  // No redirect logic here. AuthProvider and middleware handle redirects.
  // This component focuses on showing loading state or content based on user state.

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  // If not loading and no user, AuthProvider or middleware would have already redirected.
  // So, if we reach here without a user, it means the route is not protected by this component
  // or there's a state inconsistency (which the AuthProvider should prevent).
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Access Denied. Please login.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>
}