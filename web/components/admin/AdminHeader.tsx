'use client';

import { cn } from '@/lib/utils';
import ThemeSwitch from '@/components/ThemeSwitch';
import UserButton from '@/components/auth/UserButton';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

function getAdminPageTitle(pathname: string): string {
  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';
  const title = segments[0].replace(/-/g, ' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export default function AdminHeader() {
  const pathname = usePathname();
  const title = getAdminPageTitle(pathname);

  return (
    <header
      className={cn(
        'bg-sidebar flex flex-row items-center gap-3 border-b px-4 py-3',
      )}
    >
      <ShieldCheck className="text-primary size-5" />
      <span className="text-lg font-semibold">{title}</span>

      <div className="ml-auto flex items-center gap-3">
        <ThemeSwitch />
        <UserButton />
      </div>
    </header>
  );
}
