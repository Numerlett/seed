import type { AppRouter } from '@seed/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import React, { useState, type ReactNode } from 'react';
import SuperJSON from 'superjson';

import { API_URL } from './config';
import {
  clearTokens,
  getAccessTokenSync,
  getRefreshToken,
  setTokens,
} from './auth/tokenStore';

// Mobile's tRPC React instance. Typed by AppRouter (type-only import → never bundles server code).
// We use httpLink (not httpBatchLink) so each request maps to a clean HTTP status, which makes
// the 401 → refresh → retry logic below reliable.
export const trpc = createTRPCReact<AppRouter>();

// A bare client used ONLY to refresh tokens, with no auth wrapper to avoid infinite recursion.
const refreshClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: API_URL, transformer: SuperJSON })],
});

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return false;
        const res = await refreshClient.auth.getNewAccessToken.query({
          refreshToken,
          method: 'return',
        });
        if (res?.accessToken && res?.refreshToken) {
          await setTokens(res.accessToken, res.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// fetch wrapper: attach Bearer token; on 401, refresh once and retry.
const authFetch: typeof fetch = async (input, init) => {
  const doFetch = () => {
    const token = getAccessTokenSync();
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input as RequestInfo, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doFetch();
    } else {
      // Refresh failed → session is dead; clear so the app falls back to login.
      await clearTokens();
    }
  }
  return res;
};

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpLink({
          url: API_URL,
          transformer: SuperJSON,
          fetch: authFetch,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
