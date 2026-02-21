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
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { SaleInvoiceListItem } from '@/types/sales';

interface SaleInvoiceDetailSheetProps {
  invoice: SaleInvoiceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SaleInvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
}: SaleInvoiceDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: detail, isLoading } =
    clientTrpc.sales.getSaleInvoiceById.useQuery(
      { id: invoice?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!invoice?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation = clientTrpc.sales.confirmSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice confirmed and stock updated');
      utils.sales.getSaleInvoices.invalidate();
      utils.sales.getSaleInvoiceById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = clientTrpc.sales.cancelSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice cancelled');
      utils.sales.getSaleInvoices.invalidate();
      utils.sales.getSaleInvoiceById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = clientTrpc.sales.deleteSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice deleted');
      utils.sales.getSaleInvoices.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const paymentMutation = clientTrpc.sales.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success('Payment status updated');
      utils.sales.getSaleInvoices.invalidate();
      utils.sales.getSaleInvoiceById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!invoice || !activeBusiness) return;
    confirmMutation.mutate({ id: invoice.id, businessId: activeBusiness.id });
  };

  const handleCancel = () => {
    if (!invoice || !activeBusiness) return;
    cancelMutation.mutate({ id: invoice.id, businessId: activeBusiness.id });
  };

  const handleDelete = () => {
    if (!invoice || !activeBusiness) return;
    deleteMutation.mutate({ id: invoice.id, businessId: activeBusiness.id });
  };

  const handlePaymentStatusChange = (status: 'UNPAID' | 'PARTIAL' | 'PAID') => {
    if (!invoice || !activeBusiness) return;
    paymentMutation.mutate({
      id: invoice.id,
      businessId: activeBusiness.id,
      paymentStatus: status,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Invoice {invoice?.documentNumber || ''}</SheetTitle>
          <SheetDescription>Sale invoice details</SheetDescription>
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
              {/* Header Info */}
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
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">
                    {formatDate(detail.invoiceDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {detail.dueDate ? formatDate(detail.dueDate) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <StatusBadge status={detail.paymentStatus} />
                </div>
                {detail.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{detail.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {detail.status === 'DRAFT' && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm">Confirm Invoice</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Invoice?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will deduct stock from the warehouse. This
                            action cannot be undone.
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
                          Cancel Invoice
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the invoice as cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Go Back</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel}>
                            Cancel Invoice
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the draft invoice.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {detail.status === 'CONFIRMED' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Update Payment:</span>
                    <Select
                      value={detail.paymentStatus}
                      onValueChange={(val) =>
                        handlePaymentStatusChange(
                          val as 'UNPAID' | 'PARTIAL' | 'PAID',
                        )
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Disc %</TableHead>
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
                          {item.taxRate}%
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discount}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-sm">
                <div className="flex justify-end gap-8">
                  <span className="text-muted-foreground">Tax Amount</span>
                  <span className="font-medium">
                    {formatCurrency(detail.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-muted-foreground">Discount Amount</span>
                  <span className="font-medium">
                    {formatCurrency(detail.discountAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-end gap-8 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(detail.totalAmount)}</span>
                </div>
              </div>

              {/* Sales Returns */}
              {detail.salesReturns && detail.salesReturns.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-3 text-sm font-semibold">
                      Linked Sales Returns
                    </h4>
                    <div className="space-y-2">
                      {detail.salesReturns.map((ret: any) => (
                        <div
                          key={ret.id}
                          className="flex items-center justify-between rounded border p-2 text-sm"
                        >
                          <div>
                            <span className="font-medium">
                              {ret.documentNumber}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {formatDate(ret.returnDate)}
                            </span>
                          </div>
                          <StatusBadge status={ret.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
