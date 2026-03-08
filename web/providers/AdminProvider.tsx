'use client';

import { clientTrpc } from '@seed/api/client';
import { createContext, useContext, ReactNode, useMemo } from 'react';

type AdminMe = TrpcAppRouterOutputType['admin']['auth']['getAdminMe'];

export interface AdminContextType {
  admin: AdminMe | undefined;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  admin: undefined,
  isSuperAdmin: false,
  isLoading: true,
});

export default function AdminProvider({ children }: { children: ReactNode }) {
  const { data: admin, isLoading } = clientTrpc.admin.auth.getAdminMe.useQuery(
    undefined,
    {
      retry: (failureCount, error) => {
        if (
          error.data?.code === 'UNAUTHORIZED' ||
          error.data?.code === 'FORBIDDEN'
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
  );

  const contextValue: AdminContextType = useMemo(
    () => ({
      admin,
      isSuperAdmin: admin?.isSuperAdmin ?? false,
      isLoading,
    }),
    [admin, isLoading],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
