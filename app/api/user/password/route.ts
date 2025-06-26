import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Regular client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyUser(authHeader: string | null) {
  console.log('verifyUser - Auth header:', authHeader ? 'present' : 'missing');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('verifyUser - Invalid auth header format');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('verifyUser - Token extracted, length:', token.length);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('verifyUser - getUser result:', { user: !!user, error: !!error });
    
    if (error || !user) {
      console.log('verifyUser - No user or error:', error?.message);
      return null;
    }

    console.log('verifyUser - User ID:', user.id);
    return user;
  } catch (error) {
    console.error('User verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/user/password - Starting password change');
    
    const authHeader = request.headers.get('authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      console.log('Password change failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    console.log('Password change request for user:', user.id);

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Verify current password by attempting to sign in
    console.log('Verifying current password...');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      console.log('Current password verification failed:', signInError.message);
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password using admin client
    console.log('Updating password...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log password change in accounts table
    await supabaseAdmin
      .from('accounts')
      .update({ 
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);

    console.log('Password updated successfully for user:', user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}