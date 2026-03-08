'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/providers/AdminProvider';

export default function AdminManagementPage() {
  const { admin: currentAdmin } = useAdmin();
  const utils = clientTrpc.useUtils();

  const { data: admins, isLoading } =
    clientTrpc.admin.management.listAdmins.useQuery();

  const deactivateAdmin =
    clientTrpc.admin.management.deactivateAdmin.useMutation({
      onSuccess: () => {
        toast.success('Admin deactivated');
        utils.admin.management.listAdmins.invalidate();
      },
      onError: (err) => toast.error(err.message || 'Failed to deactivate'),
    });

  const activateAdmin = clientTrpc.admin.management.activateAdmin.useMutation({
    onSuccess: () => {
      toast.success('Admin activated');
      utils.admin.management.listAdmins.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to activate'),
  });

  const toggleSuperAdmin =
    clientTrpc.admin.management.toggleSuperAdmin.useMutation({
      onSuccess: () => {
        toast.success('Super admin status updated');
        utils.admin.management.listAdmins.invalidate();
      },
      onError: (err) => toast.error(err.message || 'Failed to update'),
    });

  const isSelf = (adminId: string) => currentAdmin?.id === adminId;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="size-6" />
          Admin Management
        </h2>
        <Badge variant="secondary">
          {admins?.length ?? 0} admin{admins?.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added on</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !admins || admins.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No admins found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {admin.user.name || 'Unnamed'}
                        {isSelf(admin.id) && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{admin.user.email}</TableCell>
                    <TableCell>
                      {admin.isActive ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {admin.isSuperAdmin ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Crown className="mr-1 size-3" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf(admin.id) && (
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Active */}
                          {admin.isActive ? (
                            <ConfirmAction
                              title="Deactivate Admin"
                              description={`This will deactivate ${admin.user.name || admin.user.email}. They won't be able to access the admin panel.`}
                              actionLabel="Deactivate"
                              variant="destructive"
                              onConfirm={() =>
                                deactivateAdmin.mutate({
                                  adminId: admin.id,
                                })
                              }
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Deactivate"
                              >
                                <UserX className="size-4" />
                              </Button>
                            </ConfirmAction>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Activate"
                              onClick={() =>
                                activateAdmin.mutate({ adminId: admin.id })
                              }
                            >
                              <UserCheck className="size-4" />
                            </Button>
                          )}

                          {/* Toggle Super Admin */}
                          {admin.isSuperAdmin ? (
                            <ConfirmAction
                              title="Remove Super Admin"
                              description={`This will remove super admin privileges from ${admin.user.name || admin.user.email}.`}
                              actionLabel="Demote"
                              variant="destructive"
                              onConfirm={() =>
                                toggleSuperAdmin.mutate({
                                  adminId: admin.id,
                                  isSuperAdmin: false,
                                })
                              }
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Remove Super Admin"
                              >
                                <ShieldOff className="size-4" />
                              </Button>
                            </ConfirmAction>
                          ) : (
                            <ConfirmAction
                              title="Promote to Super Admin"
                              description={`This will give ${admin.user.name || admin.user.email} full super admin privileges.`}
                              actionLabel="Promote"
                              onConfirm={() =>
                                toggleSuperAdmin.mutate({
                                  adminId: admin.id,
                                  isSuperAdmin: true,
                                })
                              }
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Promote to Super Admin"
                              >
                                <Crown className="size-4" />
                              </Button>
                            </ConfirmAction>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfirmAction({
  children,
  title,
  description,
  actionLabel,
  variant = 'default',
  onConfirm,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
            onClick={onConfirm}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
