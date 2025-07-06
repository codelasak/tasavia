import { createClient } from '@supabase/supabase-js'
import UsersList from './users-list'

export const dynamic = 'force-dynamic'

// Server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AdminUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  role?: string;
  accountData?: {
    name?: string;
    phone_number?: string;
    status: 'active' | 'inactive' | 'suspended';
    allowed_login_methods: 'email_only' | 'phone_only' | 'both';
    created_by_admin_id?: string;
    created_at: string;
    updated_at: string;
  };
}

async function getUsers() {
  // Return empty array for build-time, data will be fetched client-side
  // This page requires admin authentication which can only be verified at runtime
  return [] as AdminUser[];
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return <UsersList initialUsers={users} />
}