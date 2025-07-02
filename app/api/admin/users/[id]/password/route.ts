import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthHandler } from '@/lib/auth-middleware';
import { z } from 'zod';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Input validation schema
const passwordResetSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  forceChange: z.boolean().optional().default(true)
});

const paramsSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});

async function logAdminAction(
  adminId: string,
  targetUserId: string,
  actionType: string,
  details: any,
  request: NextRequest
) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';

    await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        target_user_id: targetUserId,
        action_type: actionType,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

async function handlePasswordReset(
  request: NextRequest,
  { params }: { params: { id: string } },
  adminUser: any
) {
  try {
    // Validate params
    const validatedParams = paramsSchema.parse(params);
    const userId = validatedParams.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = passwordResetSchema.parse(body);
    const { password, forceChange } = validatedBody;

    // Check if target user exists
    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !targetUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log the admin action for audit trail
    await logAdminAction(
      adminUser.id,
      userId,
      'password_reset',
      {
        forced_change: forceChange,
        target_user_email: targetUser.user.email
      },
      request
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = createAuthHandler(handlePasswordReset, 'super_admin');