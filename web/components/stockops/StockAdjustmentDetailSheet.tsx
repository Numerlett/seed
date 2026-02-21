'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared';
import { toast } from 'sonner';
import type { StockAdjustmentListItem } from '@/types/stockops';

interface StockAdjustmentDetailSheetProps {
  adjustment: StockAdjustmentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockAdjustmentDetailSheet({
  adjustment,
  open,
  onOpenChange,
}: StockAdjustmentDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: detail, isLoading } =
    clientTrpc.stockops.getStockAdjustmentById.useQuery(
      { id: adjustment?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!adjustment?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation =
    clientTrpc.stockops.confirmStockAdjustment.useMutation({
      onSuccess: () => {
        toast.success('Adjustment confirmed — stock updated');
        utils.stockops.getStockAdjustments.invalidate();
        utils.stockops.getStockAdjustmentById.invalidate();
      },
      onError: (err) => toast.error(err.message),
    });

  const cancelMutation = clientTrpc.stockops.cancelStockAdjustment.useMutation({
    onSuccess: () => {
      toast.success('Adjustment cancelled');
      utils.stockops.getStockAdjustments.invalidate();
      utils.stockops.getStockAdjustmentById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!adjustment || !activeBusiness) return;
    confirmMutation.mutate({
      id: adjustment.id,
      businessId: activeBusiness.id,
    });
  };

  const handleCancel = () => {
    if (!adjustment || !activeBusiness) return;
    cancelMutation.mutate({
      id: adjustment.id,
      businessId: activeBusiness.id,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Adjustment {adjustment?.documentNumber || ''}</SheetTitle>
          <SheetDescription>Stock adjustment details</SheetDescription>
        </SheetHeader>

        {isLoading || !detail ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{detail.warehouse?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDate(detail.adjustmentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">{detail.reason}</p>
                </div>
                {detail.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{detail.notes}</p>
                  </div>
                )}
              </div>

              {detail.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm">Confirm Adjustment</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm Stock Adjustment?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will update inventory levels based on the
                          adjustment quantities. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel Adjustment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Adjustment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the adjustment as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>
                          Cancel Adjustment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold">Adjustment Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">System Qty</TableHead>
                      <TableHead className="text-right">Actual Qty</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items?.map((item: any) => {
                      const diff = item.adjustQuantity;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.product?.name || '—'}
                              </p>
                              {item.batch && (
                                <p className="text-muted-foreground text-xs">
                                  Batch: {item.batch.batchNumber}
                                </p>
                              )}
                              {item.shelf && (
                                <p className="text-muted-foreground text-xs">
                                  Shelf: {item.shelf.shelfCode}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.systemQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.actualQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                diff > 0
                                  ? 'default'
                                  : diff < 0
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitCost)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
