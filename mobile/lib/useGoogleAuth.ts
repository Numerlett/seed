import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { trpc } from './trpc';
import { errorMessage } from './utils';

// Required so the auth popup can close and hand the result back to the app.
WebBrowser.maybeCompleteAuthSession();

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/** True when at least one Google OAuth client ID is configured in the env. */
export const googleAuthConfigured =
  !!iosClientId || !!androidClientId || !!webClientId;

/**
 * Native Google sign-in. Runs the Google OAuth flow to obtain an ID token, then
 * exchanges it with the backend (`auth.googleSignInMobile`) for SEED tokens.
 *
 * Note: native Google sign-in needs platform OAuth client IDs and generally a
 * development build — it does not work reliably in Expo Go.
 */
export function useGoogleAuth({
  onSuccess,
  onError,
}: {
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onError?: (message: string) => void;
}) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });
  const [verifying, setVerifying] = useState(false);
  const signInMobile = trpc.auth.googleSignInMobile.useMutation();

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      if (response.type === 'error') {
        onError?.(response.error?.message ?? 'Google sign-in failed');
      }
      return;
    }

    const idToken = response.params?.id_token;
    if (!idToken) {
      onError?.('No Google ID token returned');
      return;
    }

    setVerifying(true);
    signInMobile.mutate(
      { idToken },
      {
        onSuccess: (data) => {
          setVerifying(false);
          if (data?.accessToken && data?.refreshToken) {
            onSuccess({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
          }
        },
        onError: (e) => {
          setVerifying(false);
          onError?.(errorMessage(e));
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    /** Whether Google sign-in can be attempted (configured + request ready). */
    available: googleAuthConfigured && !!request,
    /** True while exchanging the ID token with the backend. */
    loading: verifying,
    /** Opens the Google sign-in flow. */
    signIn: () => promptAsync(),
  };
}
