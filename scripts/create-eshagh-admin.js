// Script to create eshagh@fennaver.com as admin user
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createEshaghAdmin() {
  try {
    console.log('Creating admin user for eshagh@fennaver.com...');

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

    console.log('User created successfully:', userData.user.id);

    // Create account record
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .upsert({
        id: userData.user.id,
        name: 'Eshagh Shahnavazi',
        status: 'active',
        allowed_login_methods: 'both'
      });

    if (accountError) {
      console.warn('Failed to create account record:', accountError);
    } else {
      console.log('Account record created successfully');
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
        .insert({
          user_id: userData.user.id,
          role_id: adminRole.role_id
        });

      if (roleError) {
        console.warn('Failed to assign admin role:', roleError);
      } else {
        console.log('Admin role assigned successfully');
      }
    }

    console.log('✅ Eshagh admin account created successfully!');
    console.log('Credentials: eshagh@fennaver.com / TempPassword123!');
    console.log('⚠️  Please change the password on first login');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
  }
}

createEshaghAdmin();