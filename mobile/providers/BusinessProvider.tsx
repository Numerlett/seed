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
  getStoredBusinessMembershipId,
  setStoredBusinessMembershipId,
} from '../lib/auth/tokenStore';
import { useSession } from './SessionProvider';

type Memberships = RouterOutputs['business']['getBusinessesMemberships'];
type Membership = Memberships[number];

interface BusinessContextValue {
  memberships: Memberships;
  activeMembership: Membership | null;
  activeBusiness: Membership['business'] | null;
  /** The id to pass into every businessMemberProcedure call. */
  businessId: string | null;
  memberRole: string | null;
  isLoading: boolean;
  switchBusiness: (membershipId: string) => void;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(
  undefined,
);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSession();
  const [activeId, setActiveId] = useState<string | null>(null);

  const membershipsQuery = trpc.business.getBusinessesMemberships.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );

  const memberships = useMemo(
    () => membershipsQuery.data ?? [],
    [membershipsQuery.data],
  );

  // Resolve the active membership once data arrives: prefer stored selection, else first.
  useEffect(() => {
    if (memberships.length === 0) return;
    let cancelled = false;
    void (async () => {
      const stored = await getStoredBusinessMembershipId();
      if (cancelled) return;
      const exists =
        stored && memberships.some((m) => m.id === stored) ? stored : null;
      const next = exists ?? memberships[0].id;
      setActiveId(next);
      if (next !== stored) await setStoredBusinessMembershipId(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [memberships]);

  const switchBusiness = (membershipId: string) => {
    setActiveId(membershipId);
    void setStoredBusinessMembershipId(membershipId);
  };

  const activeMembership =
    memberships.find((m) => m.id === activeId) ?? memberships[0] ?? null;

  const value: BusinessContextValue = {
    memberships,
    activeMembership,
    activeBusiness: activeMembership?.business ?? null,
    businessId: activeMembership?.businessId ?? null,
    memberRole: activeMembership?.role ?? null,
    isLoading: membershipsQuery.isLoading,
    switchBusiness,
    refetch: () => void membershipsQuery.refetch(),
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}

/**
 * Returns the active businessId, asserting it exists. Use inside (app) screens
 * where a business is guaranteed to be selected.
 */
export function useBusinessId(): string {
  const { businessId } = useBusiness();
  return businessId ?? '';
}
