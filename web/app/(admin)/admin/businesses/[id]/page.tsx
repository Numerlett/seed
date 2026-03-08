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
  Users,
  Package,
  Warehouse,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/providers/AdminProvider';
import Link from 'next/link';

export default function AdminBusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isSuperAdmin } = useAdmin();
  const utils = clientTrpc.useUtils();

  const { data: business, isLoading } =
    clientTrpc.admin.businesses.getBusinessDetail.useQuery({
      businessId: params.id,
    });

  const deleteBusiness = clientTrpc.admin.businesses.deleteBusiness.useMutation(
    {
      onSuccess: () => {
        toast.success('Business deleted successfully');
        utils.admin.businesses.listBusinesses.invalidate();
        router.push('/admin/businesses');
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to delete business');
      },
    },
  );

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

  if (!business) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Business not found.</p>
        <Link href="/admin/businesses">
          <Button variant="link">Back to businesses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/businesses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{business.name}</h2>
            <p className="text-muted-foreground text-sm">
              Owned by{' '}
              {business.owner?.name || business.owner?.email || 'Unknown'}
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 size-4" />
                Delete Business
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this business?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the business and all its data
                  including products, inventory, sales, and purchases. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    deleteBusiness.mutate({ businessId: business.id })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {business.email && (
              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground size-4" />
                <span>{business.email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="text-muted-foreground size-4" />
                <span>{business.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground size-4" />
              <span>
                Created {new Date(business.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Users className="text-muted-foreground size-3" />
                  <p className="text-2xl font-bold">
                    {business._count.members}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">Members</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Package className="text-muted-foreground size-3" />
                  <p className="text-2xl font-bold">
                    {business._count.products}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">Products</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Warehouse className="text-muted-foreground size-3" />
                  <p className="text-2xl font-bold">
                    {business._count.warehouses}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">Warehouses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({business.members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {business.members.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members.</p>
            ) : (
              business.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/admin/users/${member.user.id}`}
                  className="hover:bg-muted flex items-center justify-between rounded-md border p-3 transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name || 'Unnamed'}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {member.user.email}
                    </p>
                  </div>
                  {member.user.id === business.owner?.id && (
                    <Badge variant="secondary">Owner</Badge>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
