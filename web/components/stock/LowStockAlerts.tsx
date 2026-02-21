'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
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
import { AlertTriangle } from 'lucide-react';

export default function LowStockAlerts() {
  const { activeBusiness } = useBusiness();

  const { data, isLoading } = clientTrpc.stock.getLowStockAlerts.useQuery(
    { businessId: activeBusiness?.id || '', pageSize: 10, pageNumber: 1 },
    { enabled: !!activeBusiness?.id },
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        All stock levels are healthy
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">
          {total} product{total !== 1 ? 's' : ''} below reorder level
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Reorder At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.sku || '—'}</TableCell>
              <TableCell className="text-right">
                <Badge variant="destructive">
                  {String(item.currentStockLevel)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {String(item.reorderLevel)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
