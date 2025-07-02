import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Input validation schema
const emailSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase()
});

// Standard response to prevent account enumeration
const STANDARD_RESPONSE = {
  success: true,
  message: 'If this email is associated with an account, a password reset link will be sent.'
};

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email } = emailSchema.parse(body);

    // Simulate processing time to prevent timing attacks
    const startTime = Date.now();
    const minProcessingTime = 200; // ms

    let userFound = false;
    let canResetPassword = false;

    try {
      // Find user by email using admin client
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError) {
        const user = users.find(u => u.email?.toLowerCase() === email);
        
        if (user) {
          userFound = true;
          
          // Check the user's allowed login methods
          const { data: accountData, error: accountError } = await supabaseAdmin
            .from('accounts')
            .select('allowed_login_methods')
            .eq('id', user.id)
            .single();

          if (!accountError && accountData) {
            // User can reset password if email is allowed
            canResetPassword = accountData.allowed_login_methods !== 'phone_only';
          }
        }
      }
    } catch (error) {
      console.error('Error checking reset eligibility:', error);
      // Continue with standard response
    }

    // Ensure minimum processing time to prevent timing attacks
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < minProcessingTime) {
      await new Promise(resolve => setTimeout(resolve, minProcessingTime - elapsedTime));
    }

    // Log the attempt for security monitoring (without revealing if user exists)
    console.log(`Password reset eligibility check for email domain: ${email.split('@')[1]} - IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);

    // Always return the same response to prevent account enumeration
    // The actual reset email sending logic should handle the eligibility check internally
    return NextResponse.json(STANDARD_RESPONSE);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Check reset eligibility error:', error);
    
    // Return standard response even on errors
    return NextResponse.json(STANDARD_RESPONSE);
  }
}