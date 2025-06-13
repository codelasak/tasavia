import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and the current path is a protected route,
  // redirect the user to the login page
  if (!session && req.nextUrl.pathname.startsWith('/portal/dashboard')) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  // If user is signed in and the current path is the login page,
  // redirect the user to the dashboard
  if (session && req.nextUrl.pathname === '/portal') {
    return NextResponse.redirect(new URL('/portal/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/portal/:path*']
}