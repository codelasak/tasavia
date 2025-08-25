import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Regular client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAdmin(authHeader: string | null) {
  const fs = require('fs');
  const logMsg = (msg: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync('/Users/eshagh/Desktop/webCode/tasavia/admin-debug.log', logLine);
  };
  
  logMsg('[DEBUG] verifyAdmin called with authHeader present: ' + !!authHeader);
  
  if (!authHeader?.startsWith('Bearer ')) {
    logMsg('[DEBUG] No valid Bearer token found');
    return null;
  }

  const token = authHeader.substring(7);
  logMsg('[DEBUG] Extracted token length: ' + token.length);
  
  try {
    // Create user-authenticated client
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    logMsg('[DEBUG] Verifying user token...');
    const { data: { user }, error } = await userSupabase.auth.getUser();
    logMsg(`[DEBUG] User verification result: user=${!!user}, userId=${user?.id}, error=${error?.message}`);
    
    if (error || !user) {
      logMsg('[DEBUG] User verification failed: ' + (error?.message || 'No user returned'));
      return null;
    }

    logMsg('[DEBUG] Checking admin status for user using authenticated session: ' + user.id);
    
    // Use user's authenticated session to check their own roles
    const { data: userRoles, error: roleError } = await userSupabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(role_name)
      `)
      .eq('user_id', user.id);
    
    logMsg(`[DEBUG] User roles query result: userRoles=${JSON.stringify(userRoles)}, roleError=${roleError?.message}, roleCount=${userRoles?.length}`);
    
    const isAdmin = userRoles?.some((userRole: any) => {
      const roleName = userRole.roles?.role_name;
      logMsg('[DEBUG] Checking role: ' + roleName);
      return roleName === 'admin' || roleName === 'super_admin';
    });
    
    logMsg('[DEBUG] Final admin check result: ' + isAdmin);
    
    return isAdmin ? user : null;
  } catch (error) {
    logMsg('[DEBUG] Admin verification exception: ' + error);
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

export async function PUT(request: NextRequest) {
  try {
    console.log('PUT /api/admin/users - Updating user');
    
    const authHeader = request.headers.get('authorization');
    const adminUser = await verifyAdmin(authHeader);
    
    if (!adminUser) {
      console.log('User update failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, phone, password, name, allowedLoginMethods, role } = body;
    
    console.log('Updating user:', userId, 'with data:', { email, phone, name, allowedLoginMethods, role });

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
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

    // Validate login methods if provided
    if (allowedLoginMethods && !['email_only', 'phone_only', 'both'].includes(allowedLoginMethods)) {
      return NextResponse.json(
        { error: 'Invalid login methods. Must be email_only, phone_only, or both' },
        { status: 400 }
      );
    }

    // Prepare auth updates
    const authUpdates: any = {};
    if (email) authUpdates.email = email;
    if (phone) authUpdates.phone = phone;
    if (password) authUpdates.password = password;
    if (name) authUpdates.user_metadata = { name };

    // Update auth user if there are auth-related changes
    if (Object.keys(authUpdates).length > 0) {
      console.log('Updating auth user data...');
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdates
      );
      
      if (authUpdateError) {
        console.error('Auth user update error:', authUpdateError);
        throw new Error(`Failed to update user: ${authUpdateError.message}`);
      }
    }

    // Update account record
    const accountUpdates: any = { updated_at: new Date().toISOString() };
    if (phone !== undefined) accountUpdates.phone_number = phone;
    if (name !== undefined) accountUpdates.name = name;
    if (allowedLoginMethods !== undefined) accountUpdates.allowed_login_methods = allowedLoginMethods;

    console.log('Updating account record...', accountUpdates);
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .upsert({
        id: userId,
        ...accountUpdates
      });

    if (accountError) {
      console.error('Account update error:', accountError);
      // Don't fail the entire update if account update fails
      console.warn('Failed to update account record, continuing...');
    }

    // Update user role if provided
    if (role) {
      console.log('Updating user role to:', role);
      
      try {
        // First, get the role ID
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('roles')
          .select('role_id')
          .eq('role_name', role)
          .single();

        if (roleError || !roleData) {
          console.error('Role not found:', role, roleError);
          throw new Error(`Role '${role}' not found in system`);
        }

        // Delete existing role assignments for this user
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Assign the new role to the user
        const { error: userRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: roleData.role_id,
            assigned_at: new Date().toISOString()
          });

        if (userRoleError) {
          console.error('Failed to assign role:', userRoleError);
          throw new Error(`Failed to assign role: ${userRoleError.message}`);
        }

        console.log('Role updated successfully');
      } catch (roleUpdateError) {
        console.error('Error updating role:', roleUpdateError);
        throw roleUpdateError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}