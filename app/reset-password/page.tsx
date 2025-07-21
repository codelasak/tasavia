"use client"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false
  });
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false
  });
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle password recovery flow - simplified and more robust
  useEffect(() => {
    const handlePasswordRecovery = async () => {
      console.log('Reset password: Initializing recovery flow');
      
      // Get all relevant URL parameters
      const params = {
        code: searchParams.get('code'),
        tokenHash: searchParams.get('token_hash'),
        type: searchParams.get('type'),
        accessToken: searchParams.get('access_token'),
        refreshToken: searchParams.get('refresh_token')
      };
      
      console.log('Reset password: Parameters present:', Object.keys(params).filter(key => params[key as keyof typeof params]));
      
      try {
        // Prioritized verification methods - try in order of reliability
        let sessionEstablished = false;

        // Method 1: Code exchange (most reliable)
        if (params.code) {
          console.log('Reset password: Attempting code exchange');
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          
          if (!error && data.session) {
            console.log('Reset password: Code exchange successful');
            setIsSessionReady(true);
            sessionEstablished = true;
          } else {
            console.warn('Reset password: Code exchange failed:', error?.message);
          }
        }

        // Method 2: Token hash verification
        if (!sessionEstablished && params.tokenHash && params.type === 'recovery') {
          console.log('Reset password: Attempting token hash verification');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: 'recovery'
          });
          
          if (!error) {
            console.log('Reset password: Token hash verification successful');
            setIsSessionReady(true);
            sessionEstablished = true;
          } else {
            console.warn('Reset password: Token hash verification failed:', error?.message);
          }
        }

        // Method 3: Direct session setup
        if (!sessionEstablished && params.accessToken && params.refreshToken) {
          console.log('Reset password: Attempting direct session setup');
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken
          });
          
          if (!error) {
            console.log('Reset password: Direct session setup successful');
            setIsSessionReady(true);
            sessionEstablished = true;
          } else {
            console.warn('Reset password: Direct session setup failed:', error?.message);
          }
        }

        // Method 4: Check for existing session
        if (!sessionEstablished) {
          console.log('Reset password: Checking for existing session');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Reset password: Found existing valid session');
            setIsSessionReady(true);
            sessionEstablished = true;
          }
        }

        // If no method worked, show error and redirect
        if (!sessionEstablished) {
          console.error('Reset password: All verification methods failed');
          setError('Invalid or expired reset link. Please request a new password reset.');
          setTimeout(() => {
            router.push('/forgot-password?error=expired-link');
          }, 3000);
        }

      } catch (error: any) {
        console.error('Reset password: Recovery flow failed:', error);
        setError('Failed to process reset link. Please try requesting a new password reset.');
        setTimeout(() => {
          router.push('/forgot-password?error=recovery-failed');
        }, 3000);
      }
    };

    // Listen for auth state changes as backup verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Reset password: Auth state change -', event, session ? 'session present' : 'no session');
        
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session && !isSessionReady) {
          console.log('Reset password: Session established via auth state change');
          setIsSessionReady(true);
        }
      }
    );

    handlePasswordRecovery();

    return () => subscription.unsubscribe();
  }, [searchParams, router, isSessionReady]);

  // Validate password and update rules UI
  useEffect(() => {
    const validatePassword = () => {
      const rules = {
        length: formData.password.length >= 6,
        lowercase: /[a-z]/.test(formData.password),
        uppercase: /[A-Z]/.test(formData.password),
        number: /\d/.test(formData.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      };
      setPasswordRules(rules);
      setIsPasswordValid(Object.values(rules).every(Boolean));
    };
    validatePassword();
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Reset password: Form submission started');
    setError("");
    setIsLoading(true);

    try {
      // Validation checks
      if (!isSessionReady) {
        throw new Error('Session not ready. Please click the reset link from your email again.');
      }

      if (!formData.password.trim()) {
        throw new Error('Password is required');
      }
      
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!isPasswordValid) {
        throw new Error('Password does not meet security requirements');
      }

      console.log('Reset password: All validations passed, updating password');

      // Verify session is still valid before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session has expired. Please request a new password reset link.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (updateError) {
        console.error('Reset password: Update failed:', updateError);
        throw new Error(updateError.message || 'Failed to update password');
      }

      console.log('Reset password: Password updated successfully');
      
      // Success - redirect to login with success message
      const successMessage = encodeURIComponent('Password updated successfully! You can now sign in with your new password.');
      router.push(`/login?message=${successMessage}&type=success`);

    } catch (err: any) {
      console.error('Reset password: Form submission failed:', err);
      
      let userErrorMessage = err.message || 'Failed to reset password';
      
      // Provide more helpful error messages
      if (err.message?.includes('Session')) {
        userErrorMessage = 'Your reset session has expired. Please request a new password reset link.';
      } else if (err.message?.includes('Password')) {
        userErrorMessage = 'Password update failed. Please check your requirements and try again.';
      }
      
      setError(userErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Debug: log current state
  console.log('Render state - isSessionReady:', isSessionReady, 'error:', error);

  // Show loading while establishing session
  if (!isSessionReady && !error) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-100 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 transition-colors">
        <motion.div
          className="relative w-full max-w-md p-8 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 backdrop-blur-lg z-10 text-center"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Verifying Reset Link
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please wait while we verify your password reset request...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-100 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 transition-colors">
      {/* Animated background blobs */}
      <motion.div
        className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-600 via-cyan-400 to-cyan-200 opacity-30 rounded-full blur-3xl z-0"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      />
      <motion.div
        className="absolute -bottom-40 right-0 w-[28rem] h-[28rem] bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-200 opacity-30 rounded-full blur-3xl z-0"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      
      {/* Main content */}
      <motion.div
        className="relative w-full max-w-md p-8 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 backdrop-blur-lg z-10"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Reset Password
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
          Enter your new password below to complete the reset process.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
              <Input
                id="password"
                type={showPasswords.password ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('password')}
                disabled={isLoading}
              >
                {showPasswords.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {isMounted && formData.password && (
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Requirements:</p>
                <div className="space-y-1">
                  {[
                    { key: 'length', label: 'At least 6 characters' },
                    { key: 'lowercase', label: 'Contains lowercase letter' },
                    { key: 'uppercase', label: 'Contains uppercase letter' },
                    { key: 'number', label: 'Contains number' },
                    { key: 'special', label: 'Contains special character' }
                  ].map(rule => (
                    <div key={rule.key} className="flex items-center gap-2 text-sm">
                      {passwordRules[rule.key as keyof typeof passwordRules] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={passwordRules[rule.key as keyof typeof passwordRules] ? 'text-green-600' : 'text-gray-500'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isLoading}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg hover:from-cyan-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all text-lg tracking-wide"
            disabled={isLoading || !isPasswordValid || formData.password !== formData.confirmPassword}
            onClick={() => console.log('Button clicked! Disabled:', isLoading || !isPasswordValid || formData.password !== formData.confirmPassword)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-slate-800 p-3 rounded-md">
            <p className="font-medium">Security Tips:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Use a unique password that you don&apos;t use elsewhere</li>
              <li>Consider using a password manager</li>
              <li>Avoid using personal information in your password</li>
            </ul>
          </div>
        </form>
      </motion.div>
    </div>
  );
}