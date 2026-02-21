'use client';
import GoogleButton from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { LoaderCircleIcon, LogInIcon, SendIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';
import Countdown, { CountdownRendererFn } from 'react-countdown';
import { ErrorAlertDialog } from '@/components/ui/error-alert-dialog';
import { clientTrpc } from '@seed/api/client';

const LOGIN_STATE_KEY = 'login-otp-state';

// Helper function to load persisted login state
const loadPersistedLoginState = () => {
  const savedState = sessionStorage.getItem(LOGIN_STATE_KEY);
  if (savedState) {
    try {
      const { email: savedEmail, otpExpiresAt: savedExpiry } =
        JSON.parse(savedState);
      const expiryDate = new Date(savedExpiry);

      // Only restore if OTP hasn't expired
      if (expiryDate > new Date()) {
        return {
          email: savedEmail,
          otpExpiresAt: expiryDate,
          otpSent: true,
        };
      } else {
        // Clear expired state
        sessionStorage.removeItem(LOGIN_STATE_KEY);
      }
    } catch (error) {
      sessionStorage.removeItem(LOGIN_STATE_KEY);
    }
  }
  return { email: '', otpExpiresAt: null, otpSent: false };
};

export default function LoginPage() {
  const router = useRouter();
  const redirect = useSearchParams().get('redirect');
  const { refreshSession } = useSession();

  // Initialize state with persisted values to avoid setState in effect
  const [email, setEmail] = useState<string>(
    () => loadPersistedLoginState().email,
  );
  const [otp, setOtp] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(
    () => loadPersistedLoginState().otpExpiresAt,
  );
  const [otpSent, setOtpSent] = useState<boolean>(
    () => loadPersistedLoginState().otpSent,
  );
  const [sendingOtp, startSendingOtp] = useTransition();
  const [verifyingOtp, startVerifyingOtp] = useTransition();
  const [errorDialog, setErrorDialog] = useState<{
    message: string;
    errorCode?: string;
  } | null>(null);

  const emailLoginMutation = clientTrpc.auth.emailLogin.useMutation({
    onSuccess: ({ otpExpiresAt, message }) => {
      setOtpSent(true);
      setOtpExpiresAt(otpExpiresAt);

      // Persist state to sessionStorage
      sessionStorage.setItem(
        LOGIN_STATE_KEY,
        JSON.stringify({ email, otpExpiresAt }),
      );

      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message || 'Error sending OTP');
    },
  });
  const emailVerifyMutation = clientTrpc.auth.emailVerify.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);

      // Clear persisted state on successful verification
      sessionStorage.removeItem(LOGIN_STATE_KEY);

      refreshSession();
      router.push(redirect || '/dashboard');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendOtp = async () => {
    startSendingOtp(async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      await emailLoginMutation.mutateAsync({ email });
    });
  };

  const verifyOtp = async () => {
    startVerifyingOtp(async () => {
      if (!(otp.trim() && otp.length === 6)) {
        toast.error('Please enter a valid OTP');
        return;
      }
      await emailVerifyMutation.mutateAsync({ email, otp });
    });
  };

  const CountdownRenderer: CountdownRendererFn = ({
    minutes,
    seconds,
    completed,
  }) => {
    if (completed) {
      return <span className="text-red-500">OTP has expired</span>;
    } else {
      return <span>{`OTP expires in ${minutes}:${seconds}`}</span>;
    }
  };

  const handleOtpExpired = () => {
    setOtpSent(false);
    setOtp('');
    setOtpExpiresAt(null);

    // Clear persisted state when OTP expires
    sessionStorage.removeItem(LOGIN_STATE_KEY);

    toast.error('OTP has expired', { description: 'Try logging in again' });
  };

  return (
    <Card>
      <CardContent className="flex w-sm max-w-full flex-col items-center gap-4">
        <span className={cn('text-2xl font-bold')}>L O G I N</span>
        {otpSent ? (
          <>
            <span className="font-light">
              Verify OTP sent to <b className="font-bold underline">{email}</b>
            </span>
            {otpExpiresAt && (
              <Countdown
                date={otpExpiresAt}
                renderer={CountdownRenderer}
                onComplete={handleOtpExpired}
              />
            )}
            <InputOTP
              value={otp}
              onChange={(otp: string) => setOtp(otp)}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  verifyOtp();
                }
              }}
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
            <Button
              onClick={verifyOtp}
              disabled={verifyingOtp}
              className="w-full"
              size={'sm'}
            >
              {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
              {verifyingOtp ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <LogInIcon />
              )}
            </Button>
          </>
        ) : (
          <>
            <Input
              name="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sendOtp();
                }
              }}
            />
            <Button
              onClick={sendOtp}
              disabled={sendingOtp}
              className="w-full"
              size={'sm'}
            >
              {sendingOtp ? 'Sending...' : 'Send OTP'}
              {sendingOtp ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
            </Button>
            <Separator />
            <GoogleButton className="w-full" />
          </>
        )}
      </CardContent>

      {/* Error Alert Dialog */}
      {errorDialog && (
        <ErrorAlertDialog
          open={!!errorDialog}
          onOpenChange={(open) => !open && setErrorDialog(null)}
          message={errorDialog.message}
          errorCode={errorDialog.errorCode}
        />
      )}
    </Card>
  );
}
