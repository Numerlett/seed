import Header from '@/components/main/Header';
import Navbar from '@/components/main/NavBar';
import { ReactNode } from 'react';
import { DataProvider } from '@/providers/DataProvider';
import { BusinessProvider } from '@/providers/BusinessProvider';
import AuthGuard from '@/auth/AuthGuard';
import { CategoriesProvider } from '@/providers/CategoriesProvider';

/**
 * Main Application Layout
 *
 * Layout for authenticated users accessing the main application features.
 * Provides the core application structure with:
 * - Business context for multi-tenant operations
 * - Data provider for UI state management
 * - Responsive sidebar navigation
 * - Top header with user controls
 * - Main content area with scrolling
 */

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <main className="bg-background text-foreground h-screen w-full overflow-hidden">
        <DataProvider>
          <BusinessProvider>
            <CategoriesProvider>
              <div className="flex h-full w-full">
                {/* Sidebar: fixed width, always visible, no overlap */}
                <div className="sticky top-0 z-30 h-screen shrink-0">
                  <Navbar />
                </div>
                {/* Main content: flex column, header sticky, content scrollable */}
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="bg-background z-20 shrink-0">
                    <Header />
                  </div>
                  <div className="flex flex-1 flex-col overflow-y-auto">
                    {children}
                  </div>
                </div>
              </div>
            </CategoriesProvider>
          </BusinessProvider>
        </DataProvider>
      </main>
    </AuthGuard>
  );
}
