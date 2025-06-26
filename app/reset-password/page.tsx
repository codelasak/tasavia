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

  // Handle password recovery flow
  useEffect(() => {
    const handlePasswordRecovery = async () => {
      // Debug: Log all URL parameters
      console.log('All URL parameters:', Object.fromEntries(searchParams.entries()));
      
      // Check for different possible parameter combinations
      const tokenHash = searchParams.get('token_hash');
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      console.log('Parameters found:', { tokenHash, token, code, type, accessToken, refreshToken });
      
      // Try different verification methods based on what's available
      if (code) {
        try {
          console.log('Attempting code exchange for session with code:', code);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange failed:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setTimeout(() => router.push('/forgot-password'), 3000);
            return;
          }
          
          console.log('Code exchange successful:', data);
          if (data.session) {
            console.log('Session established, setting ready to true');
            setIsSessionReady(true);
          } else {
            console.log('Code exchange returned no session');
            setError('Failed to establish session. Please request a new password reset.');
            setTimeout(() => router.push('/forgot-password'), 3000);
          }
        } catch (err) {
          console.error('Code exchange error:', err);
          setError('Failed to process reset link. Please try again.');
          setTimeout(() => router.push('/forgot-password'), 3000);
        }
      } else if (tokenHash && type === 'recovery') {
        try {
          console.log('Attempting token_hash verification...');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Token hash verification failed:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setTimeout(() => router.push('/forgot-password'), 3000);
            return;
          }
          
          setIsSessionReady(true);
        } catch (err) {
          console.error('Password recovery error:', err);
          setError('Failed to process reset link. Please try again.');
          setTimeout(() => router.push('/forgot-password'), 3000);
        }
      } else if (accessToken && refreshToken) {
        try {
          console.log('Attempting session setup with tokens...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Session setup failed:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setTimeout(() => router.push('/forgot-password'), 3000);
            return;
          }
          
          setIsSessionReady(true);
        } catch (err) {
          console.error('Session setup error:', err);
          setError('Failed to process reset link. Please try again.');
          setTimeout(() => router.push('/forgot-password'), 3000);
        }
      } else {
        // Check if there's already a valid session (maybe Supabase set it automatically)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Found existing session');
          setIsSessionReady(true);
        } else {
          console.log('No valid parameters or session found, redirecting...');
          // Wait a bit longer before redirecting to allow for any async auth processes
          setTimeout(() => {
            router.push('/forgot-password');
          }, 2000);
        }
      }
    };

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Reset page auth state change:', event, session ? 'has session' : 'no session');
        console.log('Current isSessionReady state:', isSessionReady);
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          console.log('Setting session ready to true from auth state change');
          setIsSessionReady(true);
          console.log('Session ready state should now be true');
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
    console.log('Form submitted! Starting password reset...');
    setError("");
    setIsLoading(true);

    try {
      console.log('Checking session ready state:', isSessionReady);
      // Check if session is ready
      if (!isSessionReady) {
        throw new Error('Session not ready. Please click the reset link from your email again.');
      }

      console.log('Session ready - proceeding with validation...');

      // Validation
      console.log('Checking password field:', formData.password ? 'has password' : 'no password');
      if (!formData.password.trim()) {
        throw new Error('Password is required');
      }
      
      console.log('Checking password match...');
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      console.log('Checking password validity:', isPasswordValid);
      if (!isPasswordValid) {
        throw new Error('Password does not meet security requirements');
      }

      console.log('All validations passed - proceeding to session check...');

      // Check current session before updating with timeout
      const getSessionWithTimeout = () => {
        return Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Session check timeout')), 5000);
          })
        ]);
      };

      const sessionResult = await getSessionWithTimeout() as any;
      const { data: sessionData } = sessionResult;
      console.log('Current session before update:', sessionData.session ? 'valid session' : 'no session');
      
      if (!sessionData.session) {
        throw new Error('Session expired. Please click the reset link from your email again.');
      }

      // Update password with timeout
      console.log('Attempting to update password...');
      
      const updatePasswordWithTimeout = () => {
        return Promise.race([
          supabase.auth.updateUser({
            password: formData.password
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Password update timeout - please try again')), 10000);
          })
        ]);
      };

      const result = await updatePasswordWithTimeout() as any;
      const { data, error } = result;

      console.log('Password update result:', { data, error });

      if (error) {
        console.error('Password update failed:', error);
        throw error;
      }

      console.log('Password updated successfully, redirecting...');
      // Success - redirect to login with success message
      const successMessage = encodeURIComponent('Password updated successfully! You can now sign in with your new password.');
      router.push(`/login?message=${successMessage}&type=success`);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reset password';
      setError(errorMessage);
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