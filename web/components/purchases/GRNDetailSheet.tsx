'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { GRNListItem } from '@/types/purchase';

interface GRNDetailSheetProps {
  grn: GRNListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GRNDetailSheet({
  grn,
  open,
  onOpenChange,
}: GRNDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const [confirmAction, setConfirmAction] = useState<
    'confirm' | 'cancel' | null
  >(null);

  const { data: detail, isLoading } = clientTrpc.purchase.getGRNById.useQuery(
    { id: grn?.id || '', businessId: activeBusiness?.id || '' },
    { enabled: !!grn?.id && !!activeBusiness?.id && open },
  );

  const confirmMutation = clientTrpc.purchase.confirmGRN.useMutation({
    onSuccess: () => {
      toast.success('GRN confirmed! Stock updated.');
      utils.purchase.getGRNs.invalidate();
      utils.purchase.getGRNById.invalidate();
      utils.stock.getStockSummary.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm GRN');
    },
  });

  const cancelMutation = clientTrpc.purchase.cancelGRN.useMutation({
    onSuccess: () => {
      toast.success('GRN cancelled');
      utils.purchase.getGRNs.invalidate();
      utils.purchase.getGRNById.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel GRN');
    },
  });

  const handleAction = () => {
    if (!grn || !activeBusiness) return;
    if (confirmAction === 'confirm') {
      confirmMutation.mutate({ id: grn.id, businessId: activeBusiness.id });
    } else if (confirmAction === 'cancel') {
      cancelMutation.mutate({ id: grn.id, businessId: activeBusiness.id });
    }
  };

  const isPending = confirmMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-2xl">
              {detail?.documentNumber || grn?.documentNumber || 'GRN'}
            </SheetTitle>
            <SheetDescription>Goods Receipt Note Details</SheetDescription>
          </SheetHeader>

          <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
            {isLoading ? (
              <div className="space-y-4 p-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : detail ? (
              <div className="space-y-6 p-3">
                {/* Status & Actions */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={detail.status} />
                  {detail.status === 'DRAFT' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setConfirmAction('confirm')}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Confirm & Receive Stock
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmAction('cancel')}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Supplier</span>
                    <p className="font-medium">
                      {detail.supplier?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Warehouse</span>
                    <p className="font-medium">
                      {detail.warehouse?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Received Date</span>
                    <p className="font-medium">
                      {formatDate(detail.receivedDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PO Reference</span>
                    <p className="font-medium">
                      {detail.purchaseOrder?.documentNumber || '—'}
                    </p>
                  </div>
                </div>

                {detail.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes</span>
                    <p>{detail.notes}</p>
                  </div>
                )}

                <Separator />

                {/* Line Items */}
                <div>
                  <h3 className="mb-2 font-semibold">Received Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product?.name || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {String(item.quantityReceived)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirm/Cancel Action Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'confirm'
                ? 'Confirm Goods Receipt?'
                : 'Cancel GRN?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'confirm'
                ? 'This will update stock levels for all items in this GRN. This action cannot be undone.'
                : 'This will cancel the goods receipt note.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                confirmAction === 'cancel'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction === 'confirm' ? 'Confirm' : 'Cancel GRN'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
