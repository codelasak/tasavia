import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email using admin client
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      // Return success to prevent account enumeration
      return NextResponse.json({ 
        eligible: true,
        message: 'If this email exists, a reset link will be sent.'
      });
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Return success to prevent account enumeration
      return NextResponse.json({ 
        eligible: true,
        message: 'If this email exists, a reset link will be sent.'
      });
    }

    // Check the user's allowed login methods
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('allowed_login_methods, phone_number')
      .eq('id', user.id)
      .single();

    if (accountError) {
      console.error('Error fetching account data:', accountError);
      // Default to allowing reset if we can't check restrictions
      return NextResponse.json({ 
        eligible: true,
        message: 'If this email exists, a reset link will be sent.'
      });
    }

    if (accountData?.allowed_login_methods === 'phone_only') {
      const phoneHint = accountData.phone_number 
        ? ` Please contact support or use your phone number ending in ${accountData.phone_number.slice(-4)} for authentication.`
        : ' Please contact support for assistance with your account.';
      
      return NextResponse.json({
        eligible: false,
        error: 'Email password reset is not available for this account.' + phoneHint
      });
    }

    return NextResponse.json({ 
      eligible: true,
      message: 'Password reset is available for this account.'
    });

  } catch (error: any) {
    console.error('Check reset eligibility error:', error);
    // Return success to prevent revealing system errors
    return NextResponse.json({ 
      eligible: true,
      message: 'If this email exists, a reset link will be sent.'
    });
  }
}