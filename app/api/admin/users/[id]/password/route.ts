import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Regular client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifySuperAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Check if user is super admin
    const { data: adminCheck } = await supabaseAdmin
      .from('user_roles')
      .select(`
        roles!inner(role_name)
      `)
      .eq('user_id', user.id);
    
    const isSuperAdmin = adminCheck?.some((role: any) => 
      role.roles?.role_name === 'super_admin'
    );
    
    return isSuperAdmin ? user : null;
  } catch (error) {
    console.error('Super admin verification error:', error);
    return null;
  }
}

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

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const superAdmin = await verifySuperAdmin(authHeader);
    
    if (!superAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized - Super admin access required' 
      }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();
    const { password, forceChange = true } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

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
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Log the admin action for audit trail
    await logAdminAction(
      superAdmin.id,
      userId,
      'password_reset',
      {
        forced_change: forceChange,
        target_user_email: targetUser.user.email
      },
      request
    );

    // If forceChange is true, we could implement additional logic here
    // For now, we'll just log it in the audit trail

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully',
      forceChange: forceChange
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}