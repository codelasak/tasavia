'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, User } from 'lucide-react';

interface ProfilePictureProps {
  name?: string;
  email?: string;
  pictureUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
}

export function ProfilePicture({ 
  name, 
  email, 
  pictureUrl, 
  size = 'lg', 
  editable = false 
}: ProfilePictureProps) {
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = () => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8 text-sm';
      case 'md':
        return 'h-12 w-12 text-base';
      case 'lg':
        return 'h-16 w-16 text-lg';
      case 'xl':
        return 'h-24 w-24 text-xl';
      default:
        return 'h-16 w-16 text-lg';
    }
  };

  const getAvatarBgColor = () => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500'
    ];
    
    const nameOrEmail = name || email || 'User';
    const index = nameOrEmail.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleUpload = async () => {
    setIsUploading(true);
    // TODO: Implement file upload to Supabase Storage
    // For now, we'll just simulate the upload
    setTimeout(() => {
      setIsUploading(false);
      // toast.success('Profile picture upload will be available soon!');
    }, 1000);
  };

  if (editable) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Your profile picture helps others recognize you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className={`${getSizeClasses()} border-4 border-white shadow-lg`}>
                <AvatarImage src={pictureUrl} alt={name || email || 'User'} />
                <AvatarFallback className={`${getAvatarBgColor()} text-white font-semibold`}>
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              {editable && (
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">{name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              
              {pictureUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="text-xs text-center text-muted-foreground bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Photo Upload Coming Soon!</p>
              <p>Profile picture uploads will be available in a future update. For now, we&apos;re showing your initials.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Non-editable version (for display only)
  return (
    <Avatar className={getSizeClasses()}>
      <AvatarImage src={pictureUrl} alt={name || email || 'User'} />
      <AvatarFallback className={`${getAvatarBgColor()} text-white font-semibold`}>
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}