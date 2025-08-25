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
  console.log('verifyAdmin - Auth header:', authHeader ? 'present' : 'missing');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('verifyAdmin - Invalid auth header format');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('verifyAdmin - Token extracted, length:', token.length);
  
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

    const { data: { user }, error } = await userSupabase.auth.getUser();
    console.log('verifyAdmin - getUser result:', { user: !!user, error: !!error });
    
    if (error || !user) {
      console.log('verifyAdmin - No user or error:', error?.message);
      return null;
    }

    console.log('verifyAdmin - User ID:', user.id);

    // Use user's authenticated session to check their own roles
    const { data: adminCheck, error: adminError } = await userSupabase
      .from('user_roles')
      .select(`
        roles!inner(role_name)
      `)
      .eq('user_id', user.id);
    
    console.log('verifyAdmin - Admin check result:', { data: adminCheck, error: adminError });
    
    const isAdmin = adminCheck?.some((role: any) => 
      role.roles?.role_name === 'admin' || role.roles?.role_name === 'super_admin'
    );
    
    console.log('verifyAdmin - Is admin:', isAdmin);
    
    return isAdmin ? user : null;
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('PATCH /api/admin/users/[id] - Starting request');
    
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    const adminUser = await verifyAdmin(authHeader);
    console.log('Admin user verified:', !!adminUser);
    
    if (!adminUser) {
      console.log('Unauthorized - no admin user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    
    const { status, allowedLoginMethods, email, phone, name, role } = body;

    // Update user auth data if provided
    if (email || phone || name) {
      const updates: any = {};
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (name) updates.user_metadata = { name };

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
      
      if (error) {
        throw new Error(error.message);
      }
    }

    // Update account data
    const accountUpdates: any = {};
    if (status) accountUpdates.status = status;
    if (allowedLoginMethods) accountUpdates.allowed_login_methods = allowedLoginMethods;
    if (phone) accountUpdates.phone_number = phone;
    if (name) accountUpdates.name = name;
    accountUpdates.updated_at = new Date().toISOString();

    if (Object.keys(accountUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from('accounts')
        .upsert({
          id: userId,
          ...accountUpdates
        });

      if (error) {
        console.error('Account update error:', error);
        // Don't fail the entire update if account update fails
      }
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
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // PUT and PATCH should do the same thing for user updates
  return PATCH(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminUser = await verifyAdmin(authHeader);
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // First, check if the user exists and get their info
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError) {
      throw new Error(`User not found: ${getUserError.message}`);
    }

    // Check if this user is the only super admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select(`
        roles!inner(role_name)
      `)
      .eq('user_id', userId);

    const isSuperAdmin = userRoles?.some((role: any) => 
      role.roles?.role_name === 'super_admin'
    );

    if (isSuperAdmin) {
      // Count total super admins
      const { data: allSuperAdmins } = await supabaseAdmin
        .from('user_roles')
        .select(`
          user_id,
          roles!inner(role_name)
        `)
        .eq('roles.role_name', 'super_admin');

      if (allSuperAdmins && allSuperAdmins.length <= 1) {
        throw new Error('Cannot delete the last super admin user');
      }
    }

    // Delete related records in the correct order to avoid foreign key constraint issues
    
    // 1. Delete user roles
    const { error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (userRolesError) {
      console.error('Error deleting user roles:', userRolesError);
    }

    // 2. Update admin_actions to set foreign keys to NULL instead of deleting
    await supabaseAdmin
      .from('admin_actions')
      .update({ admin_id: null })
      .eq('admin_id', userId);

    await supabaseAdmin
      .from('admin_actions')
      .update({ target_user_id: null })
      .eq('target_user_id', userId);

    // 3. Update accounts where this user was the creating admin
    await supabaseAdmin
      .from('accounts')
      .update({ created_by_admin_id: null })
      .eq('created_by_admin_id', userId);

    // 4. Delete the account record
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .delete()
      .eq('id', userId);
    
    if (accountError) {
      console.error('Error deleting account record:', accountError);
    }

    // 5. Finally, delete the user from Supabase Auth
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      throw new Error(`Failed to delete user from auth: ${deleteUserError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}