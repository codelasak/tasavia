import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get the current user for redirect logic
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = req.nextUrl.pathname

  // Redirect logic
  const isPortalRoute = pathname.startsWith('/portal');
  const isLoginPage = pathname === '/login';

  if (isPortalRoute && !user) {
    // User is not authenticated and trying to access a protected route
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (isLoginPage && user) {
    // User is authenticated and on the login page, redirect to dashboard
    return NextResponse.redirect(new URL('/portal/dashboard', req.url));
  }
  
  if (pathname === '/portal' && user) {
    // User is authenticated and on /portal, redirect to dashboard
    return NextResponse.redirect(new URL('/portal/dashboard', req.url));
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/portal/:path*',
    '/login',
  ]
}