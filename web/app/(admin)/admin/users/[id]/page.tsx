'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Building2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/providers/AdminProvider';
import Link from 'next/link';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isSuperAdmin } = useAdmin();
  const utils = clientTrpc.useUtils();

  const { data: user, isLoading } =
    clientTrpc.admin.users.getUserDetail.useQuery({
      userId: params.id,
    });

  const deleteUser = clientTrpc.admin.users.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('User deleted successfully');
      utils.admin.users.listUsers.invalidate();
      router.push('/admin/users');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete user');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">User not found.</p>
        <Link href="/admin/users">
          <Button variant="link">Back to users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">
              {user.name || 'Unnamed User'}
            </h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 size-4" />
                Delete User
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the user and all their associated
                  data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteUser.mutate({ userId: user.id })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="text-muted-foreground size-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-muted-foreground size-4" />
              <span>{user.phone || 'No phone number'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground size-4" />
              <span>
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{user._count.memberships}</p>
                <p className="text-muted-foreground text-xs">Memberships</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {user._count.businessesOwned}
                </p>
                <p className="text-muted-foreground text-xs">Owned</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {user._count.refreshTokens}
                </p>
                <p className="text-muted-foreground text-xs">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Businesses */}
        <Card>
          <CardHeader>
            <CardTitle>Businesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.businessesOwned.length === 0 &&
            user.memberships.length === 0 ? (
              <p className="text-muted-foreground text-sm">No businesses.</p>
            ) : (
              <>
                {user.businessesOwned.map((biz) => (
                  <Link
                    key={biz.id}
                    href={`/admin/businesses/${biz.id}`}
                    className="hover:bg-muted flex items-center justify-between rounded-md border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground size-4" />
                      <span className="font-medium">{biz.name}</span>
                    </div>
                    <Badge variant="secondary">Owner</Badge>
                  </Link>
                ))}
                {user.memberships
                  .filter(
                    (m) =>
                      !user.businessesOwned.some((b) => b.id === m.business.id),
                  )
                  .map((membership) => (
                    <Link
                      key={membership.business.id}
                      href={`/admin/businesses/${membership.business.id}`}
                      className="hover:bg-muted flex items-center justify-between rounded-md border p-3 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground size-4" />
                        <span className="font-medium">
                          {membership.business.name}
                        </span>
                      </div>
                      <Badge variant="outline">Member</Badge>
                    </Link>
                  ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
