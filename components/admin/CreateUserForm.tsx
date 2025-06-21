'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, Phone, Key, Shield, Crown } from 'lucide-react';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';

interface CreateUserFormProps {
  onUserCreated?: (user: any) => void;
  adminId: string;
}

export function CreateUserForm({ onUserCreated, adminId }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    name: '',
    allowedLoginMethods: 'both' as 'email_only' | 'phone_only' | 'both',
    role: 'user' as 'user' | 'admin' | 'super_admin'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add it
    if (cleaned && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      throw new Error('Email is required');
    }
    
    if (!formData.phone.trim()) {
      throw new Error('Phone number is required');
    }
    
    if (!formData.password.trim()) {
      throw new Error('Password is required');
    }
    
    if (formData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      throw new Error('Please enter a valid email address');
    }

    // Validate phone format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(formData.phone)) {
      throw new Error('Please enter a valid phone number in international format (e.g., +1234567890)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      validateForm();

      console.log('Creating user with form data:', {
        email: formData.email,
        phone: formData.phone,
        name: formData.name,
        allowedLoginMethods: formData.allowedLoginMethods,
        role: formData.role
      });

      const result = await auth.admin.createUserWithEmailAndPhone(
        formData.email,
        formData.phone,
        formData.password,
        adminId,
        {
          allowedLoginMethods: formData.allowedLoginMethods,
          name: formData.name,
          role: formData.role
        }
      );

      console.log('User creation result:', result);

      if (result.success) {
        toast.success('User created successfully!');
        setFormData({
          email: '',
          phone: '',
          password: '',
          name: '',
          allowedLoginMethods: 'both',
          role: 'user'
        });
        onUserCreated?.(result.user);
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create user';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Create New User
        </CardTitle>
        <CardDescription>
          Create a new user account with both email and phone authentication methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={handlePhoneChange}
                className="pl-10"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for US, +90 for Turkey)
            </p>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Initial Password *</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Login Methods */}
          <div className="space-y-2">
            <Label htmlFor="loginMethods">Allowed Login Methods</Label>
            <Select
              value={formData.allowedLoginMethods}
              onValueChange={(value: 'email_only' | 'phone_only' | 'both') => 
                setFormData(prev => ({ ...prev, allowedLoginMethods: value }))
              }
            >
              <SelectTrigger className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Email and Phone</SelectItem>
                <SelectItem value="email_only">Email Only</SelectItem>
                <SelectItem value="phone_only">Phone Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which authentication methods this user can use to sign in
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">User Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'user' | 'admin' | 'super_admin') => 
                setFormData(prev => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Regular User</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="super_admin">Super Administrator</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Administrators can manage users and system settings
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating User...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}