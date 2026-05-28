import type { ReactNode } from 'react';
import { Navigation } from '@/components/home/navigation';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <Navigation />
      {children}
    </div>
  );
}
