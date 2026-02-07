import { AppRouter } from '@seed/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { cookies, headers } from 'next/headers';
import SuperJSON from 'superjson';

export const serverTrpc: ReturnType<typeof createTRPCProxyClient<AppRouter>> =
  createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_SERVER_BASE_URL + '/api',
        async headers() {
          const headerStore = await headers();
          const cookieStore = await cookies();

          // First, check if proxy set a token in the authorization header
          const authHeader = headerStore.get('authorization');
          if (authHeader) {
            return {
              authorization: authHeader,
            };
          }

          // Otherwise, check cookies
          const accessToken = cookieStore.get('access-token')?.value;
          if (!accessToken) return {};

          return {
            authorization: `Bearer ${accessToken}`,
          };
        },
        transformer: SuperJSON,
      }),
    ],
  });
