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
    console.log('Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const authHeader = request.headers.get('authorization');
    const result = await verifyUser(authHeader);
    
    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userSupabase } = result as any;

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
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('Service role key missing - cannot update auth phone. Proceeding with account update only.');
        return NextResponse.json(
          { error: 'Phone updates are temporarily unavailable. Please contact support.' },
          { status: 503 }
        );
      }
      console.log('Updating auth phone number...');
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { phone }
      );
      
      if (authUpdateError) {
        console.error('Auth phone update error:', authUpdateError);
        // Handle duplicate/conflict error from auth update explicitly
        const authErrMsg = (authUpdateError as any)?.message || 'Failed to update phone number';
        const isConflict = authErrMsg.toLowerCase().includes('already') || (authUpdateError as any)?.status === 409;
        return NextResponse.json(
          { error: isConflict ? 'Phone number is already in use' : 'Failed to update phone number' },
          { status: isConflict ? 409 : 500 }
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

    // Prefer updating via the authenticated user's client to satisfy RLS (id = auth.uid())
    let dbClient = userSupabase;

    // Try upsert directly (covers both insert + update cases)
    const upsertPayload: any = {
      id: user.id,
      ...('name' in accountUpdates ? { name: accountUpdates.name } : {}),
      ...('phone_number' in accountUpdates ? { phone_number: accountUpdates.phone_number } : {}),
      updated_at: accountUpdates.updated_at,
    };

    let { error: upsertError } = await dbClient
      .from('accounts')
      .upsert(upsertPayload);

    if (upsertError) {
      console.error('Account upsert error (user client):', upsertError);
      const code = (upsertError as any)?.code;
      const msg = (upsertError as any)?.message || '';
      if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Phone number is already in use' },
          { status: 409 }
        );
      }
      if (code === '42501') {
        // Retry with service role if available
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.warn('RLS blocked user upsert; retrying with service role');
          dbClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const { error: adminUpsertError } = await dbClient
            .from('accounts')
            .upsert(upsertPayload);
          if (adminUpsertError) {
            console.error('Account upsert error (service role):', adminUpsertError);
            return NextResponse.json(
              { error: 'Failed to update profile' },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Not authorized to update account' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    console.log('Profile updated successfully for user:', user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
