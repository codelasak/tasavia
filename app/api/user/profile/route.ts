import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Regular client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('User verification error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/user/profile - Fetching user profile');
    
    const authHeader = request.headers.get('authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account data
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (accountError) {
      console.error('Account data fetch error:', accountError);
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        roles!inner(role_name, description)
      `)
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Role data fetch error:', roleError);
    }

    const profile = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      account: accountData,
      role: roleData?.roles || { role_name: 'user', description: 'Regular user' }
    };

    return NextResponse.json({ 
      success: true, 
      profile 
    });

  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('PATCH /api/user/profile - Updating user profile');
    
    const authHeader = request.headers.get('authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;
    
    console.log('Profile update request for user:', user.id, { name, phone });

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json(
        { error: 'Name must be a string with maximum 100 characters' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number in international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Update auth user data if phone is provided
    if (phone && phone !== user.phone) {
      console.log('Updating auth phone number...');
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { phone }
      );
      
      if (authUpdateError) {
        console.error('Auth phone update error:', authUpdateError);
        return NextResponse.json(
          { error: 'Failed to update phone number' },
          { status: 500 }
        );
      }
    }

    // Update account record
    const accountUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) accountUpdates.name = name;
    if (phone !== undefined) accountUpdates.phone_number = phone;

    console.log('Updating account record...', accountUpdates);
    
    const { data: updatedAccount, error: accountError } = await supabaseAdmin
      .from('accounts')
      .update(accountUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (accountError) {
      console.error('Account update error:', accountError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('Profile updated successfully for user:', user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      account: updatedAccount
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}