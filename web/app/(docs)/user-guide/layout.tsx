'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SECTIONS } from '@/components/user-guide/sections';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, BookOpen } from 'lucide-react';

function NavLinks({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {SECTIONS.map(({ id, title, icon: Icon }) => {
        const active = activeId === id;
        return (
          <Link
            key={id}
            href={`/user-guide/${id}`}
            onClick={onSelect}
            className={cn(
              'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                active ? 'text-primary' : 'group-hover:text-foreground',
              )}
            />
            <span className="truncate">{title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function UserGuideLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeId = pathname.split('/').pop() ?? '';
  const [open, setOpen] = useState(false);

  const current = SECTIONS.find((s) => s.id === activeId);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r">
        {/* Sidebar header */}
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-md p-1.5">
              <BookOpen className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">User Guide</p>
              <p className="text-muted-foreground text-xs">SEED Documentation</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <NavLinks activeId={activeId} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 border-b px-4 py-2.5 sticky top-0 z-10 bg-background">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8">
                <Menu className="h-4 w-4" />
                <span className="text-sm">Contents</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="border-b px-5 py-4">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="bg-primary/10 rounded-md p-1.5">
                    <BookOpen className="text-primary h-4 w-4" />
                  </div>
                  User Guide
                </SheetTitle>
              </div>
              <div className="overflow-y-auto h-full pb-8">
                <NavLinks activeId={activeId} onSelect={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          {current && (
            <>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-sm font-medium truncate">{current.title}</span>
            </>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
