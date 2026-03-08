import { ReactNode } from 'react';
import AdminProvider from '@/providers/AdminProvider';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminNavBar from '@/components/admin/AdminNavBar';
import AdminHeader from '@/components/admin/AdminHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEED Admin',
  description: 'Admin Dashboard',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AdminGuard>
        <main className="bg-background text-foreground h-screen w-full overflow-hidden">
          <TooltipProvider>
            <div className="flex h-full w-full">
              {/* Sidebar */}
              <div className="sticky top-0 z-30 h-screen shrink-0">
                <AdminNavBar />
              </div>
              {/* Main content */}
              <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                <div className="bg-background z-20 shrink-0">
                  <AdminHeader />
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto">
                  {children}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </main>
      </AdminGuard>
    </AdminProvider>
  );
}
