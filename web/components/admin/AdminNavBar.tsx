'use client';

import { usePathname } from 'next/navigation';
import React, { Fragment } from 'react';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/providers/AdminProvider';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

export default function AdminNavBar() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAdmin();

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: 'Businesses',
      href: '/admin/businesses',
      icon: Building2,
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
    },
    {
      title: 'Audit Log',
      href: '/admin/audit-log',
      icon: FileText,
    },
    {
      title: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      title: 'Admins',
      href: '/admin/admins',
      icon: ShieldCheck,
      superAdminOnly: true,
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin,
  );

  return (
    <nav className="bg-sidebar flex h-full w-60 flex-col border-r p-3">
      {/* Admin Branding */}
      <div className="mb-2 flex items-center gap-2 px-2 py-3">
        <ShieldCheck className="text-primary size-7" />
        <span className="text-lg font-bold">Admin Panel</span>
      </div>

      <Separator className="mb-3" />

      {/* Nav Items */}
      <div className="flex flex-1 flex-col gap-1">
        {visibleItems.map((navLink, index) => {
          const active =
            navLink.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(navLink.href);

          return (
            <Fragment key={index}>
              {/* Separator before settings */}
              {navLink.title === 'Settings' && <Separator className="my-2" />}
              <Link
                href={navLink.href}
                className={cn(
                  'hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground',
                )}
                prefetch={true}
              >
                <navLink.icon className="size-5" />
                <span>{navLink.title}</span>
              </Link>
            </Fragment>
          );
        })}
      </div>

      {/* Back to App link */}
      <Separator className="my-2" />
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
      >
        <LayoutDashboard className="size-5" />
        <span>Back to App</span>
      </Link>
    </nav>
  );
}
