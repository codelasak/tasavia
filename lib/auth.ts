import { supabase } from './supabase/client'
import { apiClient, ApiError } from './api-client'

// Utility function to normalize phone numbers for consistent lookup
function normalizePhoneNumber(phoneNumber: string): { withPlus: string; withoutPlus: string } {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  const withoutPlus = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  
  return { withPlus, withoutPlus };
}

// Utility function to get the canonical phone format for existing users
async function getCanonicalPhoneFormat(phoneNumber: string): Promise<string> {
  const { withPlus, withoutPlus } = normalizePhoneNumber(phoneNumber);
  
  // Check if user exists with either format
  const { data: accountData } = await supabase
    .from('accounts')
    .select('id, phone_number')
    .or(`phone_number.eq.${withPlus},phone_number.eq.${withoutPlus}`)
    .single();

  if (accountData?.phone_number) {
    // Return the format stored in the accounts table
    return accountData.phone_number;
  }
  
  // Default to E.164 format for new users
  return withPlus;
}

export interface User {
  id: string
  email?: string
  phone?: string
  created_at: string
  auth_method?: 'email' | 'phone'
}

export const auth = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null
      
      // Get additional user data from accounts table
      const { data: accountData } = await supabase
        .from('accounts')
        .select('phone_number, name')
        .eq('id', user.id)
        .single()
      
      return {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone || accountData?.phone_number || undefined,
        created_at: user.created_at || '',
        auth_method: user.phone ? 'phone' : 'email'
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      // First attempt the login to get the user ID
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error

      if (data.user) {
        // Check if user account status and login methods
        const { data: accountData } = await supabase
          .from('accounts')
          .select('status, allowed_login_methods, phone_number')
          .eq('id', data.user.id)
          .single();

        if (accountData) {
          // Check if user is active
          if (accountData.status !== 'active') {
            // Sign out the user since they shouldn't be logged in
            await supabase.auth.signOut();
            throw new Error('Account is not active. Please contact an administrator.');
          }

          // Check if email login is allowed
          if (accountData.allowed_login_methods === 'phone_only') {
            // Sign out the user since they shouldn't be logged in
            await supabase.auth.signOut();
            const phoneHint = accountData.phone_number 
              ? ` Please use phone ${accountData.phone_number.slice(-4)} to sign in.`
              : ' Please use your phone number to sign in.';
            throw new Error('Email login is not enabled for this account.' + phoneHint);
          }
        }
      }

      return { user: data.user, error: null }
    } catch (error: any) {
      return { user: null, error: error.message }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      return { error: error.message }
    }
  },

  // Send OTP to phone number - use server-side API for better control
  sendOTP: async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/auth/phone-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          action: 'send-otp'
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      return result;
    } catch (error: any) {
      console.error('Phone auth error:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify OTP - use server-side API for better control
  verifyOTP: async (phoneNumber: string, otpCode: string) => {
    try {
      const response = await fetch('/api/auth/phone-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          otpCode,
          action: 'verify-otp'
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      return result;
    } catch (error: any) {
      console.error('Phone auth error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign in with phone (initiate OTP flow)
  signInWithPhone: async (phoneNumber: string) => {
    return await auth.sendOTP(phoneNumber);
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        // Get additional user data from accounts table
        const { data: accountData } = await supabase
          .from('accounts')
          .select('phone_number, name')
          .eq('id', session.user.id)
          .single()
        
        const user: User = {
          id: session.user.id,
          email: session.user.email || undefined,
          phone: session.user.phone || accountData?.phone_number || undefined,
          created_at: session.user.created_at || '',
          auth_method: session.user.phone ? 'phone' : 'email'
        }
        callback(user)
      } else {
        callback(null)
      }
    })
  },

  // Admin Functions - Use API endpoints for security
  admin: {
    // Create user with both email and phone
    createUserWithEmailAndPhone: async (
      email: string, 
      phone: string, 
      password: string, 
      adminId: string,
      options: {
        allowedLoginMethods?: 'email_only' | 'phone_only' | 'both',
        name?: string,
        role?: 'user' | 'admin' | 'super_admin'
      } = {}
    ) => {
      try {
        console.log('auth.admin.createUserWithEmailAndPhone - Starting...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Session error: ' + sessionError.message);
        }
        
        if (!session?.access_token) {
          console.error('No session or access token');
          throw new Error('Not authenticated - no session');
        }

        console.log('Making API request to /api/admin/users...');
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email,
            phone,
            password,
            name: options.name,
            allowedLoginMethods: options.allowedLoginMethods,
            role: options.role
          })
        });

        console.log('API response status:', response.status);
        const result = await response.json();
        console.log('API response data:', result);
        
        if (!response.ok) {
          throw new Error(result.error || `Failed to create user (${response.status})`);
        }

        return result;
      } catch (error: any) {
        console.error('Admin create user error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    },

    // Get user by email or phone
    getUserByEmailOrPhone: async (identifier: string) => {
      try {
        let user = null
        
        // Check if identifier looks like email or phone
        const isEmail = identifier.includes('@')
        
        if (isEmail) {
          // Search by email
          const { data, error } = await supabase.auth.admin.listUsers()
          if (error) throw error
          
          user = data.users.find(u => u.email === identifier)
        } else {
          // Search by phone - first check accounts table
          const { data: accountData } = await supabase
            .from('accounts')
            .select('id')
            .eq('phone_number', identifier)
            .single()
          
          if (accountData) {
            const { data, error } = await supabase.auth.admin.getUserById(accountData.id)
            if (error) throw error
            user = data.user
          }
        }

        if (user) {
          // Get additional account data
          const { data: accountData } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', user.id)
            .single()

          return {
            success: true,
            user: {
              ...user,
              accountData
            }
          }
        }

        return { success: false, error: 'User not found' }
      } catch (error: any) {
        console.error('Get user error:', error)
        return { success: false, error: error.message }
      }
    },

    // Update user contact methods
    updateUserContactMethods: async (
      userId: string, 
      email?: string, 
      phone?: string,
      adminId?: string
    ) => {
      try {
        const updates: any = {}
        if (email) updates.email = email
        if (phone) updates.phone = phone

        const { data, error } = await supabase.auth.admin.updateUserById(userId, updates)
        
        if (error) {
          throw new Error(error.message)
        }

        // Update accounts table
        const accountUpdates: any = {}
        if (phone) accountUpdates.phone_number = phone
        if (adminId) accountUpdates.created_by_admin_id = adminId

        if (Object.keys(accountUpdates).length > 0) {
          await supabase
            .from('accounts')
            .update(accountUpdates)
            .eq('id', userId)
        }

        return { success: true, user: data.user }
      } catch (error: any) {
        console.error('Update user error:', error)
        return { success: false, error: error.message }
      }
    },

    // List all users (admin view)
    listUsers: async (page = 1, perPage = 50) => {
      try {
        const result = await apiClient.get(`/api/admin/users?page=${page}&perPage=${perPage}`);
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('List users error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('List users error:', error);
        return { success: false, error: 'Failed to fetch users' };
      }
    },

    // Update user status
    updateUserStatus: async (
      userId: string, 
      status: 'active' | 'inactive' | 'suspended'
    ) => {
      try {
        console.log('Updating user status for:', userId, 'to:', status);
        
        const result = await apiClient.patch(`/api/admin/users/${userId}`, { status });
        
        console.log('Update user status result:', result);
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Update user status error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Update user status error:', error);
        return { success: false, error: 'Failed to update user status' };
      }
    },

    // Toggle user login methods
    toggleUserLoginMethods: async (
      userId: string, 
      methods: 'email_only' | 'phone_only' | 'both'
    ) => {
      try {
        const result = await apiClient.patch(`/api/admin/users/${userId}`, { allowedLoginMethods: methods });
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Toggle login methods error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Toggle login methods error:', error);
        return { success: false, error: 'Failed to update login methods' };
      }
    },

    // Delete user
    deleteUser: async (userId: string) => {
      try {
        const result = await apiClient.delete(`/api/admin/users/${userId}`);
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Delete user error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Delete user error:', error);
        return { success: false, error: 'Failed to delete user' };
      }
    }
  },

  // Personal Profile Management Functions
  profile: {
    // Get current user's full profile
    getProfile: async () => {
      try {
        const result = await apiClient.get('/api/user/profile');
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Get profile error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Get profile error:', error);
        return { success: false, error: 'Failed to fetch profile' };
      }
    },

    // Update current user's profile
    updateProfile: async (data: { name?: string; phone?: string }) => {
      try {
        const result = await apiClient.patch('/api/user/profile', data);
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Update profile error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Update profile error:', error);
        return { success: false, error: 'Failed to update profile' };
      }
    },

    // Change password
    changePassword: async (currentPassword: string, newPassword: string) => {
      try {
        const result = await apiClient.post('/api/user/password', {
          currentPassword,
          newPassword
        });
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('Change password error:', error.message);
          return { success: false, error: error.message };
        }
        console.error('Change password error:', error);
        return { success: false, error: 'Failed to change password' };
      }
    }
  }
}