import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  )

  // Refresh session if expired - required for Server Components
  // and to ensure cookie is set for client-side components to read
  await supabase.auth.getSession()

  // Get the current user for redirect logic
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = req.nextUrl.pathname

  // Redirect logic
  const isProtectedRoute = pathname.startsWith('/portal/') && pathname !== '/portal'
  const isLoginPage = pathname === '/login'

  if (isProtectedRoute && !user) {
    // User is not authenticated and trying to access a protected route
    return NextResponse.redirect(new URL('/login', req.url))
  } else if (isLoginPage && user) {
    // User is authenticated and on the login page, redirect to dashboard
    return NextResponse.redirect(new URL('/portal/dashboard', req.url))
  } else if (pathname === '/portal' && user) {
    // User is authenticated and on /portal, redirect to dashboard
    return NextResponse.redirect(new URL('/portal/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/portal/:path*',
    '/login',
  ]
}