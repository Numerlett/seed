'use client';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from '@/providers/SessionProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { clientTrpc } from '@seed/api/client';

export default function GoogleButton({
  className = '',
  type = 'redirect',
  showText = true,
}: {
  className?: string;
  type?: 'redirect' | 'refresh';
  showText?: boolean;
}) {
  const redirect = useSearchParams().get('redirect');
  const router = useRouter();
  const { refreshSession } = useSession();
  const clientTrpcUtils = clientTrpc.useUtils();

  useEffect(() => {
    // Flag to prevent double-firing when both postMessage and BroadcastChannel
    // deliver the same 'logged-in-successfully' event (they both fire on success).
    let handled = false;

    const onSuccess = async () => {
      if (handled) return;
      handled = true;
      toast.success('Logged in with Google successfully!');
      await new Promise((r) => setTimeout(r, 500)); // wait for cookie propagation
      await refreshSession();
      if (type === 'redirect') {
        router.push(redirect || '/');
      }
    };

    const handleMessage = (event: MessageEvent) => {
      // The callback popup runs on the same domain, so its postMessage origin
      // will always equal window.location.origin. Reject any other origins.
      if (event.origin !== window.location.origin) return;

      if (event.data === 'logged-in-successfully') {
        onSuccess();
      } else if (event.data === 'logged-in-failed') {
        toast.error('Google Login failed. Please try again.');
      }
    };

    // Listen to window.postMessage
    window.addEventListener('message', handleMessage);

    // Also listen to BroadcastChannel (works even with COOP restrictions)
    const channel = new BroadcastChannel('google-auth-channel');
    channel.onmessage = (event) => {
      if (event.data === 'logged-in-successfully') {
        onSuccess();
      }
    };

    return () => {
      window.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [type, redirect, router, refreshSession]);

  const handleGoogleLogin = async () => {
    try {
      const data = await clientTrpcUtils.auth.googleAuthUrl.fetch({
        type: 'get',
      });
      if (!data?.url) {
        toast.error('Error while Google Login...');
        return;
      }
      const width = 600;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        data.url,
        'googleLogin',
        `width=${width},height=${height},left=${left},top=${top}`,
      );
    } catch {
      toast.error('Error while Google Login...');
    }
  };

  return (
    <Button
      variant={'outline'}
      type={'button'}
      className={className}
      onClick={handleGoogleLogin}
    >
      <FcGoogle />
      {showText && 'Continue with Google'}
    </Button>
  );
}
