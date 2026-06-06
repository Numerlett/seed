import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { RouterOutputs } from '../lib/api-types';
import { trpc } from '../lib/trpc';
import {
  clearStoredBusinessMembershipId,
  clearTokens,
  hasTokenSync,
  hydrateTokens,
  setTokens,
} from '../lib/auth/tokenStore';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

type SessionUser = NonNullable<RouterOutputs['auth']['getUser']>;

interface SessionContextValue {
  user: SessionUser | null;
  status: SessionStatus;
  isAuthenticated: boolean;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    void hydrateTokens().then(() => {
      setHasToken(hasTokenSync());
      setReady(true);
    });
  }, []);

  const userQuery = trpc.auth.getUser.useQuery(undefined, {
    enabled: ready && hasToken,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const signIn = async (accessToken: string, refreshToken: string) => {
    await setTokens(accessToken, refreshToken);
    setHasToken(true);
    await utils.auth.getUser.invalidate();
  };

  const signOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // best-effort; clear locally regardless
    }
    await clearTokens();
    await clearStoredBusinessMembershipId();
    setHasToken(false);
    utils.invalidate();
  };

  const status: SessionStatus = useMemo(() => {
    if (!ready) return 'loading';
    if (!hasToken) return 'unauthenticated';
    if (userQuery.data) return 'authenticated';
    if (userQuery.isError) return 'unauthenticated';
    return 'loading';
  }, [ready, hasToken, userQuery.data, userQuery.isError]);

  const value: SessionContextValue = {
    user: userQuery.data ?? null,
    status,
    isAuthenticated: status === 'authenticated',
    signIn,
    signOut,
    refresh: () => void userQuery.refetch(),
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
