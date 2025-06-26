'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, Shield, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { ProfilePicture } from './ProfilePicture';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  last_sign_in_at: string;
  account: {
    name?: string;
    phone_number?: string;
    status: string;
    allowed_login_methods: string;
  };
  role: {
    role_name: string;
    description: string;
  };
}

export function ProfileForm() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsFetching(true);
      const result = await auth.profile.getProfile();
      
      if (result.success) {
        setProfileData(result.profile);
        setFormData({
          name: result.profile.account?.name || '',
          phone: result.profile.account?.phone_number || ''
        });
      } else {
        setError(result.error || 'Failed to load profile');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load profile');
    } finally {
      setIsFetching(false);
    }
  };

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
    if (formData.phone && !/^\+[1-9]\d{1,14}$/.test(formData.phone)) {
      throw new Error('Please enter a valid phone number in international format (e.g., +1234567890)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      validateForm();

      const result = await auth.profile.updateProfile({
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined
      });

      if (result.success) {
        setSuccess(true);
        toast.success('Profile updated successfully!');
        // Refresh profile data
        await fetchProfile();
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile';
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="bg-purple-100 text-purple-800">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Admin</Badge>;
      case 'user':
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isFetching) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileData) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load profile data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Picture Card */}
      <div className="flex justify-center">
        <ProfilePicture
          name={profileData.account?.name}
          email={profileData.email}
          pictureUrl={(profileData.account as any)?.picture_url}
          size="xl"
          editable={true}
        />
      </div>

      {/* Profile Overview Card */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Overview
          </CardTitle>
          <CardDescription>
            Your account information and current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profileData.email}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Phone Number</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profileData.account?.phone_number || 'Not set'}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{new Date(profileData.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Role</Label>
                <div className="mt-1">
                  {getRoleBadge(profileData.role.role_name)}
                </div>
                <p className="text-xs text-gray-500 mt-1">{profileData.role.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Account Status</Label>
                <div className="mt-1">
                  {getStatusBadge(profileData.account?.status)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Login Methods</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    {profileData.account?.allowed_login_methods?.replace('_', ' & ') || 'Both'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Card */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={handlePhoneChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US, +90 for Turkey)
              </p>
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
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={fetchProfile}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}