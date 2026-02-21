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
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { StockTransferListItem } from '@/types/stockops';

interface StockTransferDetailSheetProps {
  transfer: StockTransferListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockTransferDetailSheet({
  transfer,
  open,
  onOpenChange,
}: StockTransferDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: detail, isLoading } =
    clientTrpc.stockops.getStockTransferById.useQuery(
      { id: transfer?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!transfer?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation = clientTrpc.stockops.confirmStockTransfer.useMutation({
    onSuccess: () => {
      toast.success('Transfer confirmed — stock moved');
      utils.stockops.getStockTransfers.invalidate();
      utils.stockops.getStockTransferById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = clientTrpc.stockops.cancelStockTransfer.useMutation({
    onSuccess: () => {
      toast.success('Transfer cancelled');
      utils.stockops.getStockTransfers.invalidate();
      utils.stockops.getStockTransferById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!transfer || !activeBusiness) return;
    confirmMutation.mutate({
      id: transfer.id,
      businessId: activeBusiness.id,
    });
  };

  const handleCancel = () => {
    if (!transfer || !activeBusiness) return;
    cancelMutation.mutate({
      id: transfer.id,
      businessId: activeBusiness.id,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Transfer {transfer?.documentNumber || ''}</SheetTitle>
          <SheetDescription>Stock transfer details</SheetDescription>
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
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium">
                    {detail.sourceWarehouse?.name || '—'}
                    {detail.sourceShelf && (
                      <span className="text-muted-foreground">
                        {' '}
                        / {detail.sourceShelf.shelfCode}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destination</p>
                  <p className="font-medium">
                    {detail.destWarehouse?.name || '—'}
                    {detail.destShelf && (
                      <span className="text-muted-foreground">
                        {' '}
                        / {detail.destShelf.shelfCode}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDate(detail.transferDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                {detail.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{detail.notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-muted flex items-center gap-2 rounded-lg p-3 text-sm">
                <span className="font-medium">
                  {detail.sourceWarehouse?.name}
                </span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">
                  {detail.destWarehouse?.name}
                </span>
              </div>

              {detail.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm">Confirm Transfer</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm Stock Transfer?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Stock will be moved from{' '}
                          {detail.sourceWarehouse?.name} to{' '}
                          {detail.destWarehouse?.name}. This action cannot be
                          undone.
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
                        Cancel Transfer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the transfer as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>
                          Cancel Transfer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold">Transfer Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items?.map((item: any) => (
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
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                      </TableRow>
                    ))}
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
