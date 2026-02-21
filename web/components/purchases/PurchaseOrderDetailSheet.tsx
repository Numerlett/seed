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
import { Badge } from '@/components/ui/badge';
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
import type { PurchaseOrderListItem } from '@/types/purchase';

interface PurchaseOrderDetailSheetProps {
  order: PurchaseOrderListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PurchaseOrderDetailSheet({
  order,
  open,
  onOpenChange,
}: PurchaseOrderDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const [confirmAction, setConfirmAction] = useState<
    'confirm' | 'cancel' | null
  >(null);

  const { data: detail, isLoading } =
    clientTrpc.purchase.getPurchaseOrderById.useQuery(
      { id: order?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!order?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation = clientTrpc.purchase.confirmPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Purchase order confirmed!');
      utils.purchase.getPurchaseOrders.invalidate();
      utils.purchase.getPurchaseOrderById.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm');
    },
  });

  const cancelMutation = clientTrpc.purchase.cancelPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Purchase order cancelled');
      utils.purchase.getPurchaseOrders.invalidate();
      utils.purchase.getPurchaseOrderById.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel');
    },
  });

  const handleAction = () => {
    if (!order || !activeBusiness) return;
    if (confirmAction === 'confirm') {
      confirmMutation.mutate({ id: order.id, businessId: activeBusiness.id });
    } else if (confirmAction === 'cancel') {
      cancelMutation.mutate({ id: order.id, businessId: activeBusiness.id });
    }
  };

  const isPending = confirmMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-2xl">
              {detail?.documentNumber || order?.documentNumber || 'PO'}
            </SheetTitle>
            <SheetDescription>Purchase Order Details</SheetDescription>
          </SheetHeader>

          <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
            {isLoading ? (
              <div className="space-y-4 p-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : detail ? (
              <div className="space-y-6 p-3">
                {/* Header Info */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={detail.status} />
                  {detail.status === 'DRAFT' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setConfirmAction('confirm')}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Confirm
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
                    <span className="text-muted-foreground">Order Date</span>
                    <p className="font-medium">
                      {formatDate(detail.orderDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Expected Delivery
                    </span>
                    <p className="font-medium">
                      {formatDate(detail.expectedDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GRNs</span>
                    <p className="font-medium">
                      {detail.goodsReceiptNotes?.length ?? 0}
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
                  <h3 className="mb-2 font-semibold">Line Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product?.name || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {String(item.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="space-y-1 text-right text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(detail.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Discount</span>
                      <span>{formatCurrency(detail.discountAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between gap-8 text-base font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(detail.totalAmount)}</span>
                    </div>
                  </div>
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
                ? 'Confirm Purchase Order?'
                : 'Cancel Purchase Order?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'confirm'
                ? 'This will mark the purchase order as confirmed. It can no longer be edited.'
                : 'This will cancel the purchase order. This action cannot be undone.'}
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
              {confirmAction === 'confirm' ? 'Confirm' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
