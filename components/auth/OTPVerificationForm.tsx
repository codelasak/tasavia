'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface OTPVerificationFormProps {
  phoneNumber: string;
  onBack: () => void;
  onError: (error: string) => void;
}

export function OTPVerificationForm({ phoneNumber, onBack, onError }: OTPVerificationFormProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    setError('');
    setIsLoading(true);

    try {
      const result = await auth.verifyOTP(phoneNumber, otpCode);
      
      if (result.success) {
        // Successful verification - redirect to dashboard
        router.push('/portal/dashboard');
      } else {
        throw new Error(result.error || 'Failed to verify code');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify code';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [otpCode, onError, phoneNumber, router]);

  const handleResendOTP = async () => {
    setIsResending(true);
    setError('');

    try {
      const result = await auth.sendOTP(phoneNumber);
      
      if (result.success) {
        setTimeLeft(120);
        setCanResend(false);
        setOtpCode('');
      } else {
        throw new Error(result.error || 'Failed to resend code');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend code';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otpCode.length === 6 && !isLoading) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [otpCode, isLoading, handleSubmit]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Verify Phone Number</CardTitle>
        </div>
        <CardDescription className="text-center">
          Enter the 6-digit code sent to
          <br />
          <strong>{phoneNumber}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-center block">
              Verification Code
            </Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-2">
            {timeLeft > 0 ? (
              <p className="text-sm text-muted-foreground">
                Code expires in {formatTime(timeLeft)}
              </p>
            ) : (
              <p className="text-sm text-destructive">
                Code has expired
              </p>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={!canResend || isResending}
              className="text-sm"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Code'
              )}
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || otpCode.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}