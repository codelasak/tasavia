import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Regular client for auth operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Utility function to normalize phone numbers
function normalizePhoneNumber(phoneNumber: string): { withPlus: string; withoutPlus: string } {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  const withoutPlus = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  
  return { withPlus, withoutPlus };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, action, otpCode } = body;
    
    console.log('Phone Link API - Request body:', { phoneNumber, action, otpCode: otpCode ? '***' : undefined });
    
    if (!phoneNumber) {
      console.log('Phone Link API - Missing phone number');
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const { withPlus, withoutPlus } = normalizePhoneNumber(phoneNumber);
    
    if (action === 'send-otp') {
      console.log('Phone Link API - Send OTP action');
      // Check if user exists in accounts table
      const { data: accountData, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('id, status, allowed_login_methods')
        .or(`phone_number.eq.${withPlus},phone_number.eq.${withoutPlus}`)
        .single();

      console.log('Phone Link API - Account lookup result:', { accountData, accountError });

      if (accountData) {
        // Check if user is active
        if (accountData.status !== 'active') {
          return NextResponse.json(
            { error: 'Account is not active. Please contact an administrator.' },
            { status: 403 }
          );
        }

        // Check if phone login is allowed
        if (accountData.allowed_login_methods === 'email_only') {
          return NextResponse.json(
            { error: 'Phone login is not enabled for this account. Please use email to sign in.' },
            { status: 403 }
          );
        }

        // Get the auth user to use their exact phone format
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(accountData.id);
        
        if (authUser.user && authUser.user.phone) {
          // Send OTP using the existing user's phone format
          const { data, error } = await supabase.auth.signInWithOtp({
            phone: authUser.user.phone,
            options: {
              channel: 'sms'
            }
          });
          
          if (error) {
            return NextResponse.json(
              { error: error.message },
              { status: 400 }
            );
          }

          return NextResponse.json({ 
            success: true, 
            data,
            normalizedPhone: authUser.user.phone 
          });
        }
      }

      // For new users, use normalized format
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: withPlus,
        options: {
          channel: 'sms'
        }
      });
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data,
        normalizedPhone: withPlus 
      });

    } else if (action === 'verify-otp') {
      console.log('Phone Link API - Verify OTP action');
      if (!otpCode) {
        console.log('Phone Link API - Missing OTP code');
        return NextResponse.json(
          { error: 'OTP code is required' },
          { status: 400 }
        );
      }

      // Check if user exists to get their exact phone format
      const { data: accountData } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .or(`phone_number.eq.${withPlus},phone_number.eq.${withoutPlus}`)
        .single();

      let phoneToVerify = withPlus;
      
      if (accountData) {
        // Get the auth user's exact phone format
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(accountData.id);
        if (authUser.user && authUser.user.phone) {
          phoneToVerify = authUser.user.phone;
        }
      }

      // Verify OTP using the correct phone format
      console.log('Phone Link API - Verifying OTP with phone:', phoneToVerify);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneToVerify,
        token: otpCode,
        type: 'sms'
      });
      
      console.log('Phone Link API - Verify OTP result:', { data: data ? 'success' : 'null', error: error?.message });
      
      if (error) {
        console.log('Phone Link API - Verify OTP error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        user: data.user, 
        session: data.session 
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "send-otp" or "verify-otp"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Phone Link API Error:', error);
    console.error('Phone Link API Error Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}