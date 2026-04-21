'use client';

import { usePathname } from 'next/navigation';
import React, { Fragment, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Layers,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  FileText,
  BookOpen,
  Wallet,
  Building2,
  Factory,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { LuLayoutDashboard } from 'react-icons/lu';
import { useData } from '@/providers/DataProvider';
import BusinessSwitcher from './BuisnessSwitcher';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Main Navigation Sidebar Component
 *
 * Features:
 * - Collapsible sidebar with hover expansion
 * - Business switcher integration
 * - Active route highlighting
 * - Responsive design with icon-only collapsed state
 * - Conditionally renders collapsed (column) or expanded (row) nav labels
 * - Smooth framer-motion animations between states
 */

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export default function Navbar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  // Main navigation items for the retail management system
  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LuLayoutDashboard,
    },
    {
      title: 'Inventory',
      href: '/inventory',
      icon: Package,
    },
    {
      title: 'Warehouses',
      href: '/warehouses',
      icon: Warehouse,
    },
    {
      title: 'Purchases',
      href: '/purchases',
      icon: ShoppingCart,
    },
    {
      title: 'Sales',
      href: '/sales',
      icon: Receipt,
    },
    {
      title: 'Parties',
      href: '/parties',
      icon: Users,
    },
    {
      title: 'Returns',
      href: '/returns',
      icon: RotateCcw,
    },
    {
      title: 'Stock Ops',
      href: '/stock-ops',
      icon: ArrowLeftRight,
    },
    {
      title: 'Batches',
      href: '/batches',
      icon: Layers,
    },
    {
      title: 'Accounting',
      href: '/accounting',
      icon: BookOpen,
    },
    {
      title: 'Payments',
      href: '/payments',
      icon: Wallet,
    },
    {
      title: 'Banking',
      href: '/banking',
      icon: Building2,
    },
    {
      title: 'Manufacturing',
      href: '/manufacturing',
      icon: Factory,
    },
    {
      title: 'CRM',
      href: '/crm',
      icon: UserCheck,
    },
    {
      title: 'Tax & GST',
      href: '/tax',
      icon: FileText,
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: BarChart3,
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const { expanded } = useData();

  /** Whether the sidebar is visually open (either pinned or hovered) */
  const isOpen = expanded || hovered;

  return (
    <div
      className={cn(
        'relative h-full transition-all duration-300 ease-in-out',
        expanded ? 'w-60' : 'w-19',
      )}
    >
      <nav
        onMouseEnter={() => !expanded && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'navbar bg-sidebar flex h-full max-h-screen flex-col overflow-hidden border-r p-2.5 backdrop-blur-lg transition-all duration-300 ease-in-out',
          expanded
            ? 'w-60'
            : 'absolute top-0 left-0 z-10 w-19 hover:w-60 hover:shadow-xl',
        )}
      >
        {/* Business Switcher at the top */}
        <BusinessSwitcher isOpen={isOpen} />

        <Separator className="my-2" />

        {/* Main navigation items - scrollable to prevent bottom overflow */}
        <div className="flex flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
          {navItems.map((navLink, index) => {
            const active = pathname.startsWith(navLink.href);
            return (
              <Fragment key={index}>
                {/* Separator before settings (last item) */}
                {index === navItems.length - 1 && (
                  <Separator className="mt-1" />
                )}
                <Link
                  href={navLink.href}
                  className={cn(
                    'hover:bg-muted flex cursor-pointer items-center rounded-lg',
                    isOpen ? 'flex-row' : 'flex-col py-0.5',
                  )}
                  prefetch={true}
                >
                  {/* Navigation icon */}
                  <navLink.icon
                    className={cn(
                      'shrink-0 rounded-md',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground',
                      isOpen ? 'm-1.5 size-7 p-1' : 'm-1 size-6 p-1',
                    )}
                  />

                  <AnimatePresence mode="wait" initial={false}>
                    {isOpen ? (
                      /* Expanded label — displayed inline next to icon */
                      <motion.span
                        key="expanded"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'text-sm whitespace-nowrap',
                          active
                            ? 'text-foreground font-bold'
                            : 'text-muted-foreground',
                        )}
                      >
                        {navLink.title}
                      </motion.span>
                    ) : (
                      /* Collapsed label — centered below icon */
                      <motion.span
                        key="collapsed"
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'max-w-full truncate text-center text-[10px] leading-tight',
                          active
                            ? 'text-foreground font-bold'
                            : 'text-muted-foreground',
                        )}
                      >
                        {navLink.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
