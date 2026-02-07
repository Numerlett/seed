'use client';

import { clientTrpc } from '@seed/api/client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function GoogleCallback() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const googleCallbackMutation = clientTrpc.auth.googleAuthCallback.useMutation(
    {
      onSuccess() {
        // Try opener
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            'logged-in-successfully',
            window.location.origin,
          );
        }

        // Fallback
        const channel = new BroadcastChannel('google-auth-channel');
        channel.postMessage('logged-in-successfully');
        channel.close();

        setTimeout(() => window.close(), 500);
      },
    },
  );

  useEffect(() => {
    if (!code) return;
    googleCallbackMutation.mutate({ code });
  }, [code]);

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">Invalid callback URL</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Signing you in…</p>
    </div>
  );
}
