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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/shared';

interface BatchDetailSheetProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (batch: any) => void;
}

export default function BatchDetailSheet({
  batchId,
  open,
  onOpenChange,
  onEdit,
}: BatchDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: batch, isLoading } = clientTrpc.batch.getBatchById.useQuery(
    { id: batchId || '', businessId: activeBusiness?.id || '' },
    { enabled: !!batchId && !!activeBusiness?.id },
  );

  const markExpiredMutation = clientTrpc.batch.markBatchExpired.useMutation({
    onSuccess: () => {
      toast.success('Batch marked as expired');
      utils.batch.getBatchById.invalidate();
      utils.batch.getBatchesByProduct.invalidate();
      utils.batch.getExpiringBatches.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark batch as expired');
    },
  });

  const deleteMutation = clientTrpc.batch.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success('Batch deleted successfully');
      utils.batch.getBatchesByProduct.invalidate();
      utils.batch.getExpiringBatches.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error.message ||
          'Failed to delete batch. It may have stock or ledger entries.',
      );
    },
  });

  const totalStock =
    batch?.stockSummaries?.reduce(
      (sum, s: any) => sum + (s.currentQuantity || 0),
      0,
    ) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Batch Details</SheetTitle>
          <SheetDescription>
            {batch?.batchNumber || 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !batch ? (
          <div className="py-8 text-center text-red-500">Batch not found</div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Batch Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Batch Number</p>
                <p className="font-medium">{batch.batchNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Product</p>
                <p className="font-medium">{batch.product?.name || '—'}</p>
                {batch.product?.sku && (
                  <p className="text-muted-foreground text-xs">
                    SKU: {batch.product.sku}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Purchase Price</p>
                <p className="font-medium">
                  {formatCurrency(batch.purchasePrice)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Status</p>
                <Badge variant={batch.isExpired ? 'destructive' : 'secondary'}>
                  {batch.isExpired ? 'Expired' : 'Active'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Manufacturing Date
                </p>
                <p className="font-medium">
                  {batch.manufacturingDate
                    ? formatDate(batch.manufacturingDate)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Expiry Date</p>
                <p className="font-medium">
                  {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Stock</p>
                <p className="font-medium">{totalStock}</p>
              </div>
            </div>

            <Separator />

            {/* Stock by Warehouse */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Stock by Location</h3>
              {batch.stockSummaries && batch.stockSummaries.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Shelf</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.stockSummaries.map((stock: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{stock.warehouse?.name || '—'}</TableCell>
                          <TableCell>{stock.shelf?.name || '—'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {stock.currentQuantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No stock records for this batch
                </p>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(batch)}>
                  Edit Batch
                </Button>
              )}

              {!batch.isExpired && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <AlertTriangle className="mr-1.5 h-4 w-4" />
                      Mark Expired
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Mark batch as expired?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark batch &quot;{batch.batchNumber}&quot; as
                        expired. Stock will not be written off automatically —
                        create a Damage Report to write off stock.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          markExpiredMutation.mutate({
                            id: batch.id,
                            businessId: activeBusiness?.id || '',
                          })
                        }
                        disabled={markExpiredMutation.isPending}
                      >
                        {markExpiredMutation.isPending && (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        )}
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete batch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete batch &quot;
                      {batch.batchNumber}&quot;. This action cannot be undone.
                      Batches with stock or ledger entries cannot be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deleteMutation.mutate({
                          id: batch.id,
                          businessId: activeBusiness?.id || '',
                        })
                      }
                      disabled={deleteMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending && (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      )}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
