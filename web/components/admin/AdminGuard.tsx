'use client';

import { Spinner } from '@/components/ui/spinner';
import { useSession } from '@/providers/SessionProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { ShieldXIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const { admin, isLoading } = useAdmin();

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-4">
        <Spinner className="size-14" />
        <p className="text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-2 p-20">
        <ShieldXIcon className="size-16 text-red-500" />
        <span className="text-2xl font-bold text-red-500">Unauthenticated</span>
        <span className="text-muted-foreground text-sm">
          You must be logged in to access the admin panel.
        </span>
        <Link href="/login?redirect=/admin">
          <Button variant="outline" className="mt-2">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-2 p-20">
        <ShieldXIcon className="size-16 text-red-500" />
        <span className="text-2xl font-bold text-red-500">Access Denied</span>
        <span className="text-muted-foreground text-sm">
          You do not have admin privileges.
        </span>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-2">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
