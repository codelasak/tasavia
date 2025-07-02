'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone } from 'lucide-react';
import { auth } from '@/lib/auth';

interface PhoneAuthFormProps {
  onOTPSent: (phoneNumber: string) => void;
  onError: (error: string) => void;
}

export function PhoneAuthForm({ onOTPSent, onError }: PhoneAuthFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Basic validation
      if (!phoneNumber.trim()) {
        throw new Error('Please enter a phone number');
      }

      // Ensure phone number is in E.164 format
      let formattedPhone = phoneNumber.trim();
      
      // Remove all non-numeric characters except +
      formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
      
      // Ensure it starts with +
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      // Basic E.164 validation
      if (!/^\+[1-9]\d{1,14}$/.test(formattedPhone)) {
        throw new Error('Please enter a valid phone number in international format (e.g., +1234567890)');
      }

      const result = await auth.sendOTP(formattedPhone);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      if (result.success) {
        // Use the normalized phone number returned from the server
        const phoneToUse = result.normalizedPhone || formattedPhone;
        onOTPSent(phoneToUse);
      } else {
        throw new Error(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign in with Phone</CardTitle>
        <CardDescription className="text-center">
          Enter your phone number to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-10"
                disabled={isLoading}
                autoComplete="tel"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for US, +44 for UK)
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
            disabled={isLoading || !phoneNumber.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}