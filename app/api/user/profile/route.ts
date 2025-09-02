import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function verifyUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('Missing or invalid Authorization header format');
    return null;
  }

  const token = authHeader.substring(7);
  
  if (!token || token.trim() === '') {
    console.warn('Empty or invalid token');
    return null;
  }
  
  try {
    console.log('Verifying user token...');
    
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
    
    if (error) {
      console.error('Token verification error:', error.message);
      return null;
    }
    
    if (!user) {
      console.warn('Token verification returned no user');
      return null;
    }
    
    console.log(`User verified successfully: ${user.id}`);
    return { user, userSupabase };
  } catch (error) {
    console.error('User verification exception:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/user/profile - Fetching user profile');
    
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header present:', !!authHeader);
    
    const result = await verifyUser(authHeader);
    
    if (!result) {
      console.error('User verification failed, returning 401');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - Invalid or expired token' 
      }, { status: 401 });
    }

    const { user, userSupabase } = result;
    console.log(`Fetching profile data for user: ${user.id}`);

    // Get account data using user's authenticated session
    console.log('Fetching account data...');
    const { data: accountData, error: accountError } = await userSupabase
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (accountError) {
      console.error('Account data fetch error:', accountError);
      if (accountError.code === 'PGRST116') {
        console.warn('No account record found for user');
      }
    } else {
      console.log('Account data fetched successfully');
    }

    // Get user role using user's authenticated session
    console.log('Fetching user role...');
    const { data: roleData, error: roleError } = await userSupabase
      .from('user_roles')
      .select(`
        roles!inner(role_name, description)
      `)
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Role data fetch error:', roleError);
    } else if (roleError?.code === 'PGRST116') {
      console.log('No role assigned to user, using default');
    } else {
      console.log('User role fetched successfully');
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

    console.log('Profile response prepared successfully');
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
    const result = await verifyUser(authHeader);
    
    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;

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

    // Initialize admin client lazily (avoid requiring service key for GET route)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
