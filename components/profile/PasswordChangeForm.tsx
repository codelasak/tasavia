'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';

export function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validatePassword = (password: string) => {
    const rules = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return rules;
  };

  const passwordRules = validatePassword(formData.newPassword);
  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      // Validation
      if (!formData.currentPassword.trim()) {
        throw new Error('Current password is required');
      }
      
      if (!formData.newPassword.trim()) {
        throw new Error('New password is required');
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (!isPasswordValid) {
        throw new Error('New password does not meet security requirements');
      }

      if (formData.currentPassword === formData.newPassword) {
        throw new Error('New password must be different from current password');
      }

      const result = await auth.profile.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        setSuccess(true);
        toast.success('Password updated successfully!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password *</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                placeholder="Enter your current password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="pr-10"
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('current')}
                disabled={isLoading}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="pr-10"
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => togglePasswordVisibility('new')}
                disabled={isLoading}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
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

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pr-10"
                disabled={isLoading}
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
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Password updated successfully! Your account is now more secure.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isLoading || !isPasswordValid || formData.newPassword !== formData.confirmPassword}
              className="flex-1"
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
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p className="font-medium">Security Tips:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Use a unique password that you don&apos;t use elsewhere</li>
              <li>Consider using a password manager</li>
              <li>Avoid using personal information in your password</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}