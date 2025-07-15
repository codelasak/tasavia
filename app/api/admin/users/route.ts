import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Regular client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Check if user is admin by querying user_roles directly
    const { data: adminCheck } = await supabaseAdmin
      .from('user_roles')
      .select(`
        roles!inner(role_name)
      `)
      .eq('user_id', user.id);
    
    const isAdmin = adminCheck?.some((role: any) => 
      role.roles?.role_name === 'admin' || role.roles?.role_name === 'super_admin'
    );
    
    return isAdmin ? user : null;
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminUser = await verifyAdmin(authHeader);
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const perPage = parseInt(request.nextUrl.searchParams.get('perPage') || '50');

    // List users using admin client
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Get account data for all users
    const userIds = authUsers.users.map(u => u.id);
    const { data: accountsData, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .in('id', userIds);

    if (accountsError) {
      console.error('Accounts data fetch error:', accountsError);
    }

    // Get role data for all users
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        roles!inner(role_name, description)
      `)
      .in('user_id', userIds);

    if (rolesError) {
      console.error('User roles data fetch error:', rolesError);
    }

    // Merge auth, account, and role data
    const users = authUsers.users.map(user => {
      const accountData = accountsData?.find(acc => acc.id === user.id);
      const userRole = userRolesData?.find(ur => ur.user_id === user.id);
      return {
        ...user,
        accountData,
        role: (userRole?.roles as any)?.role_name || 'user'
      };
    });

    return NextResponse.json({
      success: true,
      users,
      total: authUsers.total || 0
    });

  } catch (error: any) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/users - Starting user creation');
    
    const authHeader = request.headers.get('authorization');
    const adminUser = await verifyAdmin(authHeader);
    
    if (!adminUser) {
      console.log('User creation failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, phone, password, name, allowedLoginMethods, role } = body;
    
    console.log('Creating user with data:', { email, phone, name, allowedLoginMethods, role });

    if (!email || !phone || !password) {
      return NextResponse.json(
        { error: 'Email, phone, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Please provide a valid phone number in international format' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, admin, or super_admin' },
        { status: 400 }
      );
    }

    // Validate login methods
    if (allowedLoginMethods && !['email_only', 'phone_only', 'both'].includes(allowedLoginMethods)) {
      return NextResponse.json(
        { error: 'Invalid login methods. Must be email_only, phone_only, or both' },
        { status: 400 }
      );
    }

    // Create user with admin client
    console.log('Creating user with Supabase admin client...');
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: name || ''
      }
    });
    
    if (createError) {
      console.error('Supabase user creation error:', createError);
      throw new Error(createError.message);
    }

    if (!userData.user) {
      console.error('No user returned from Supabase');
      throw new Error('Failed to create user');
    }
    
    console.log('User created successfully:', userData.user.id);

    // Create account record with admin metadata
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .upsert({
        id: userData.user.id,
        phone_number: phone,
        name: name || '',
        created_by_admin_id: adminUser.id,
        allowed_login_methods: allowedLoginMethods || 'both',
        status: 'active',
        phone_verified: true,
        phone_verified_at: new Date().toISOString()
      });

    if (accountError) {
      console.warn('Failed to create account record:', accountError);
    }

    // Assign role to user (default to 'user' if not specified)
    const userRole = role || 'user';
    console.log('Assigning role:', userRole, 'to user:', userData.user.id);
    
    try {
      // First, get the role ID
      console.log('Looking up role ID for role:', userRole);
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('role_id')
        .eq('role_name', userRole)
        .single();

      console.log('Role lookup result:', { roleData, roleError });

      if (roleError || !roleData) {
        console.error('Role not found:', userRole, roleError);
        throw new Error(`Role '${userRole}' not found in system`);
      } else {
        console.log('Assigning role ID:', roleData.role_id, 'to user:', userData.user.id);
        
        // Assign the role to the user
        const { error: userRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userData.user.id,
            role_id: roleData.role_id,
            assigned_at: new Date().toISOString()
          });

        if (userRoleError) {
          console.error('Failed to assign role:', userRoleError);
          throw new Error(`Failed to assign role: ${userRoleError.message}`);
        } else {
          console.log('Role assigned successfully');
        }
      }
    } catch (roleAssignError) {
      console.error('Error assigning role:', roleAssignError);
      throw roleAssignError;
    }

    return NextResponse.json({ 
      success: true, 
      user: userData.user,
      message: 'User created successfully with email and phone'
    });

  } catch (error: any) {
    console.error('Admin create user error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}