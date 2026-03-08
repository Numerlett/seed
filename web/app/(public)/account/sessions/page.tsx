'use client';

import { clientTrpc } from '@seed/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  LoaderCircleIcon,
  TrashIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ShieldAlertIcon,
  MailIcon,
  GlobeIcon,
  LogOutIcon,
} from 'lucide-react';
import Link from 'next/link';

// ---------- helpers ----------

/**
 * Convert a date to a human-readable relative string (Instagram-style).
 * e.g. "Active now", "2 hours ago", "3 days ago"
 */
function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 2) return 'Active now';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffWeek === 1) return '1 week ago';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      new Date(date).getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  });
}

/** Pick the right Lucide device icon based on deviceType */
function DeviceIcon({
  deviceType,
  className = 'h-6 w-6',
}: {
  deviceType?: string | null;
  className?: string;
}) {
  switch (deviceType) {
    case 'mobile':
      return <SmartphoneIcon className={className} />;
    case 'tablet':
      return <TabletIcon className={className} />;
    default:
      return <MonitorIcon className={className} />;
  }
}

/** Login method icon (Google "G" or email icon) */
function LoginMethodBadge({ method }: { method?: string | null }) {
  if (method === 'google') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
      >
        <GlobeIcon className="h-3 w-3" />
        Google
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
    >
      <MailIcon className="h-3 w-3" />
      Email
    </Badge>
  );
}

// ---------- page ----------

/**
 * Instagram-style active sessions page.
 *
 * Shows all devices where the user is currently logged in with:
 * - "This device" badge on the current session
 * - Rich device info (browser, OS, IP, login method)
 * - Relative last-active timestamps
 * - Revoke individual / other / all sessions
 */
export default function SessionsPage() {
  const router = useRouter();
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [showRevokeOthersDialog, setShowRevokeOthersDialog] = useState(false);

  const { data, isLoading, refetch } =
    clientTrpc.auth.getActiveSessions.useQuery();

  const sessions = data?.sessions;
  const currentSessionId = data?.currentSessionId;

  const revokeSessionMutation = clientTrpc.auth.revokeSessionById.useMutation({
    onSuccess: () => {
      toast.success('Session revoked successfully');
      refetch();
      setSessionToRevoke(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke session');
    },
  });

  const revokeAllMutation = clientTrpc.auth.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast.success('All sessions revoked. Redirecting to login…');
      setShowRevokeAllDialog(false);
      setTimeout(() => router.push('/login'), 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke all sessions');
    },
  });

  const revokeOthersMutation = clientTrpc.auth.revokeOtherSessions.useMutation({
    onSuccess: (result) => {
      toast.success(result?.message ?? 'Other sessions revoked');
      setShowRevokeOthersDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke other sessions');
    },
  });

  const handleRevokeSession = async (sessionId: string) => {
    await revokeSessionMutation.mutateAsync({ sessionId });
  };

  const handleRevokeAll = async () => {
    await revokeAllMutation.mutateAsync();
  };

  const handleRevokeOthers = async () => {
    await revokeOthersMutation.mutateAsync();
  };

  // Sort: current session first, then by lastActiveAt desc (already sorted server-side)
  const sortedSessions = sessions
    ? [...sessions].sort((a, b) => {
        if (a.id === currentSessionId) return -1;
        if (b.id === currentSessionId) return 1;
        return 0;
      })
    : [];

  const otherSessionCount = sessions
    ? sessions.filter((s) => s.id !== currentSessionId).length
    : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/account">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Account
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Login Activity</h1>
        <p className="text-muted-foreground">
          Review all the devices where you&apos;re currently logged in. If you
          spot something unfamiliar, remove it immediately.
        </p>
      </div>

      {/* Quick actions */}
      {sessions && sessions.length > 1 && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRevokeOthersDialog(true)}
            disabled={revokeOthersMutation.isPending || otherSessionCount === 0}
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            Log Out All Other Devices
            {otherSessionCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {otherSessionCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRevokeAllDialog(true)}
            disabled={revokeAllMutation.isPending}
          >
            <ShieldAlertIcon className="mr-2 h-4 w-4" />
            Log Out Everywhere
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Where You&apos;re Logged In</CardTitle>
          <CardDescription>
            {sessions?.length || 0} active{' '}
            {sessions?.length === 1 ? 'session' : 'sessions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {!sortedSessions || sortedSessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No active sessions found</p>
            </div>
          ) : (
            sortedSessions.map((session, index) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <div key={session.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: icon + details */}
                    <div className="flex gap-4">
                      <div
                        className={`rounded-lg p-3 ${
                          isCurrent
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <DeviceIcon
                          deviceType={session.deviceType}
                          className="h-6 w-6"
                        />
                      </div>

                      <div className="space-y-1">
                        {/* Device name + badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {session.deviceName ||
                              session.browser ||
                              'Unknown Device'}
                          </p>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground text-xs">
                              This device
                            </Badge>
                          )}
                          <LoginMethodBadge method={session.loginMethod} />
                        </div>

                        {/* OS */}
                        {session.os && (
                          <p className="text-muted-foreground text-sm">
                            {session.os}
                          </p>
                        )}

                        {/* IP + location */}
                        <p className="text-muted-foreground text-sm">
                          {session.ipAddress || 'Unknown IP'}
                          {session.location && ` · ${session.location}`}
                        </p>

                        {/* Last active */}
                        <p
                          className={`text-xs ${
                            isCurrent
                              ? 'font-medium text-green-600 dark:text-green-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isCurrent
                            ? 'Active now'
                            : session.lastActiveAt
                              ? relativeTime(session.lastActiveAt)
                              : relativeTime(session.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: revoke button */}
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSessionToRevoke(session.id)}
                        disabled={revokeSessionMutation.isPending}
                        title="End this session"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Security Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertTriangleIcon className="h-5 w-5" />
            Security Tip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            If you see a session you don&apos;t recognize, remove it
            immediately. Use{' '}
            <strong>&quot;Log Out All Other Devices&quot;</strong> to stay
            logged in only on this device.
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            We recommend reviewing your login activity regularly to keep your
            account secure.
          </p>
        </CardContent>
      </Card>

      {/* ---- Dialogs ---- */}

      {/* Revoke Single Session */}
      <AlertDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will be logged out immediately and will need to sign
              in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeSessionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sessionToRevoke && handleRevokeSession(sessionToRevoke)
              }
              disabled={revokeSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeSessionMutation.isPending ? (
                <>
                  <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                  Ending…
                </>
              ) : (
                'End Session'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Other Sessions (keep current) */}
      <AlertDialog
        open={showRevokeOthersDialog}
        onOpenChange={setShowRevokeOthersDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of all other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll stay logged in on this device, but{' '}
              {otherSessionCount === 1
                ? 'the other session'
                : `all ${otherSessionCount} other sessions`}{' '}
              will be ended immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeOthersMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeOthers}
              disabled={revokeOthersMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeOthersMutation.isPending ? (
                <>
                  <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                  Logging out…
                </>
              ) : (
                'Log Out Other Devices'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions */}
      <AlertDialog
        open={showRevokeAllDialog}
        onOpenChange={setShowRevokeAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all active sessions including this one. You&apos;ll
              need to sign in again on every device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeAllMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              disabled={revokeAllMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeAllMutation.isPending ? (
                <>
                  <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                  Logging out…
                </>
              ) : (
                'Log Out Everywhere'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
