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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDate } from '@/components/shared';

interface ProductLedgerSheetProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const txTypeLabels: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  PURCHASE_IN: { label: 'Purchase In', variant: 'default' },
  SALE_OUT: { label: 'Sale Out', variant: 'secondary' },
  SALES_RETURN_IN: { label: 'Sales Return', variant: 'outline' },
  PURCHASE_RETURN_OUT: { label: 'Purchase Return', variant: 'outline' },
  ADJUSTMENT_IN: { label: 'Adjustment In', variant: 'default' },
  ADJUSTMENT_OUT: { label: 'Adjustment Out', variant: 'secondary' },
  TRANSFER_IN: { label: 'Transfer In', variant: 'default' },
  TRANSFER_OUT: { label: 'Transfer Out', variant: 'secondary' },
  DAMAGE_OUT: { label: 'Damage', variant: 'destructive' },
  EXPIRED_OUT: { label: 'Expired', variant: 'destructive' },
};

export default function ProductLedgerSheet({
  productId,
  open,
  onOpenChange,
}: ProductLedgerSheetProps) {
  const { activeBusiness } = useBusiness();

  const { data, isLoading } = clientTrpc.stock.getProductLedger.useQuery(
    {
      businessId: activeBusiness?.id || '',
      productId: productId || '',
      pageSize: 100,
      pageNumber: 1,
    },
    { enabled: !!productId && !!activeBusiness?.id && open },
  );

  const entries = data?.data || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Product Ledger</SheetTitle>
          <SheetDescription>
            Audit trail of all stock movements
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
          {isLoading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center">
              No ledger entries found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const config = txTypeLabels[entry.transactionType];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {formatDate(entry.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config?.variant || 'outline'}>
                          {config?.label || entry.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.warehouse?.name || '—'}
                        {entry.shelf?.shelfCode
                          ? ` / ${entry.shelf.shelfCode}`
                          : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(entry.quantityIn) > 0
                          ? `+${entry.quantityIn}`
                          : Number(entry.quantityOut) > 0
                            ? `-${entry.quantityOut}`
                            : '0'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(entry.unitCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
