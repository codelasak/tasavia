import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Server-side Supabase client with service role key
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    cookies: {
      getAll() {
        return []
      },
      setAll(cookiesToSet) {
        // No-op for service role client
      },
    },
  }
);

// Regular client for auth verification
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return []
      },
      setAll(cookiesToSet) {
        // No-op for API route client
      },
    },
  }
);

export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles: string[];
}

export async function verifyToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Get user roles
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select(`
        roles!inner(role_name)
      `)
      .eq('user_id', user.id);
    
    const roles = userRoles?.map((item: { roles: { role_name: any }[] }) => item.roles[0]?.role_name).filter((role): role is string => Boolean(role)) || [];
    
    return {
      id: user.id,
      email: user.email,
      roles
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function verifyAdmin(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  const user = await verifyToken(authHeader);
  
  if (!user) return null;
  
  const isAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');
  return isAdmin ? user : null;
}

export async function verifySuperAdmin(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  const user = await verifyToken(authHeader);
  
  if (!user) return null;
  
  const isSuperAdmin = user.roles.includes('super_admin');
  return isSuperAdmin ? user : null;
}

export async function verifyUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  return await verifyToken(authHeader);
}

export function createAuthHandler<T extends { params?: any }>(
  handler: (request: NextRequest, context: T, user: AuthenticatedUser) => Promise<Response>,
  requiredRole: 'user' | 'admin' | 'super_admin' = 'user'
) {
  return async (request: NextRequest, context: T) => {
    try {
      let user: AuthenticatedUser | null = null;
      
      switch (requiredRole) {
        case 'super_admin':
          user = await verifySuperAdmin(request);
          break;
        case 'admin':
          user = await verifyAdmin(request);
          break;
        case 'user':
          user = await verifyUser(request);
          break;
      }
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return await handler(request, context, user);
    } catch (error) {
      console.error('Auth handler error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}