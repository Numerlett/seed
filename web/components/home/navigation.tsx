'use client';
import Link from 'next/link';
import ThemeSwitch from '../ThemeSwitch';
import UserButton from '../auth/UserButton';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation() {
  const { isAuthenticated } = useSession();
  const pathname = usePathname();

  return (
    <header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              S
            </div>
            <span className="text-xl font-bold">SEED</span>
          </Link>
          <div
            className={cn(
              'hidden items-center gap-6 md:flex',
              pathname !== '/' && 'md:hidden',
            )}
          >
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Benefits
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
          </div>
          <Link
            href="/user-guide"
            className={cn(
              'text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors md:block',
              pathname === '/user-guide' && 'text-foreground font-semibold',
            )}
          >
            User Guide
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeSwitch />
          {isAuthenticated && (
            <Link href={'/dashboard'}>
              <Button>Dashboard</Button>
            </Link>
          )}
          <UserButton />
        </div>
      </nav>
    </header>
  );
}
