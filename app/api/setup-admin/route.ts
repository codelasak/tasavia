import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you can make this more secure
    const body = await request.json();
    const { secret } = body;
    
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Creating admin user for eshagh@fennaver.com...');

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === 'eshagh@fennaver.com');
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      // Create user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'eshagh@fennaver.com',
        password: 'TempPassword123!', // User should change this
        email_confirm: true,
        user_metadata: {
          name: 'Eshagh Shahnavazi'
        }
      });
      
      if (createError) {
        throw new Error(createError.message);
      }

      if (!userData.user) {
        throw new Error('Failed to create user');
      }

      userId = userData.user.id;
      console.log('User created successfully:', userId);
    }

    // Create/update account record
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .upsert({
        id: userId,
        name: 'Eshagh Shahnavazi',
        status: 'active',
        allowed_login_methods: 'both'
      });

    if (accountError) {
      console.warn('Account record error:', accountError);
    } else {
      console.log('Account record created/updated successfully');
    }

    // Grant admin role
    const { data: adminRole } = await supabaseAdmin
      .from('roles')
      .select('role_id')
      .eq('role_name', 'admin')
      .single();

    if (adminRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: adminRole.role_id
        });

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key error
        console.warn('Role assignment error:', roleError);
      } else {
        console.log('Admin role assigned successfully');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin accounts set up successfully',
      credentials: {
        email: 'eshagh@fennaver.com',
        tempPassword: 'TempPassword123!'
      }
    });

  } catch (error) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Setup failed' },
      { status: 500 }
    );
  }
}