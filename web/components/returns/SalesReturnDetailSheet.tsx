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
import { toast } from 'sonner';
import type { SalesReturnListItem } from '@/types/returns';

interface SalesReturnDetailSheetProps {
  returnItem: SalesReturnListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SalesReturnDetailSheet({
  returnItem,
  open,
  onOpenChange,
}: SalesReturnDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: detail, isLoading } =
    clientTrpc.returns.getSalesReturnById.useQuery(
      { id: returnItem?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!returnItem?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation = clientTrpc.returns.confirmSalesReturn.useMutation({
    onSuccess: () => {
      toast.success('Sales return confirmed — stock updated');
      utils.returns.getSalesReturns.invalidate();
      utils.returns.getSalesReturnById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = clientTrpc.returns.cancelSalesReturn.useMutation({
    onSuccess: () => {
      toast.success('Sales return cancelled');
      utils.returns.getSalesReturns.invalidate();
      utils.returns.getSalesReturnById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!returnItem || !activeBusiness) return;
    confirmMutation.mutate({
      id: returnItem.id,
      businessId: activeBusiness.id,
    });
  };

  const handleCancel = () => {
    if (!returnItem || !activeBusiness) return;
    cancelMutation.mutate({
      id: returnItem.id,
      businessId: activeBusiness.id,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            Sales Return {returnItem?.documentNumber || ''}
          </SheetTitle>
          <SheetDescription>Sales return details</SheetDescription>
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
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{detail.customer?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{detail.warehouse?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return Date</p>
                  <p className="font-medium">{formatDate(detail.returnDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                {detail.saleInvoice && (
                  <div>
                    <p className="text-muted-foreground">Linked Invoice</p>
                    <p className="font-medium">
                      {detail.saleInvoice.documentNumber}
                    </p>
                  </div>
                )}
                {detail.reason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">{detail.reason}</p>
                  </div>
                )}
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
                      <Button size="sm">Confirm Return</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm Sales Return?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will add returned stock back into the warehouse.
                          This action cannot be undone.
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
                        Cancel Return
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Cancel Sales Return?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the return as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>
                          Cancel Return
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold">Return Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                            {item.shelf && (
                              <p className="text-muted-foreground text-xs">
                                Shelf: {item.shelf.shelfCode}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
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

              <div className="space-y-1 text-right text-sm">
                <div className="flex justify-end gap-8 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(detail.totalAmount)}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
