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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/components/shared';

export default function ExpiringBatchesTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const pageNumber = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const daysAhead = parseInt(searchParams.get('daysAhead') || '30');

  const { data, isLoading, isError } =
    clientTrpc.batch.getExpiringBatches.useQuery(
      {
        businessId: activeBusiness?.id || '',
        daysAhead,
        pageSize,
        pageNumber,
      },
      { enabled: !!activeBusiness?.id },
    );

  const batches = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total || 0;

  const updateParams = (
    params: Record<string, string | number | undefined>,
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.replace(`?${newParams.toString()}`);
  };

  const getDaysUntilExpiry = (expiryDate: string | Date) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Expiring within</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={daysAhead}
            onChange={(e) =>
              updateParams({
                daysAhead: parseInt(e.target.value) || 30,
                page: 1,
              })
            }
            className="w-20"
          />
          <span className="text-sm font-medium">days</span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-red-500">
                  Error loading expiring batches
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground text-center"
                >
                  No batches expiring within {daysAhead} days
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch: any) => {
                const daysLeft = batch.expiryDate
                  ? getDaysUntilExpiry(batch.expiryDate)
                  : null;
                const totalStock =
                  batch.stockSummaries?.reduce(
                    (sum: number, s: any) => sum + (s.currentQuantity || 0),
                    0,
                  ) || 0;

                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      {batch.batchNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{batch.product?.name || '—'}</p>
                        <p className="text-muted-foreground text-xs">
                          {batch.product?.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                    </TableCell>
                    <TableCell>
                      {daysLeft !== null && (
                        <Badge
                          variant={
                            daysLeft <= 7
                              ? 'destructive'
                              : daysLeft <= 14
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {daysLeft} days
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(batch.purchasePrice)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {batch.stockSummaries?.length > 0 ? (
                          batch.stockSummaries.map((s: any, idx: number) => (
                            <p key={idx} className="text-xs">
                              {s.warehouse?.name}: {s.currentQuantity}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            No stock
                          </p>
                        )}
                        <p className="text-xs font-medium">
                          Total: {totalStock}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {batches.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1}{' '}
          to {Math.min(pageNumber * pageSize, total)} of {total} batches
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ page: 1 })}
            disabled={pageNumber === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ page: Math.max(1, pageNumber - 1) })}
            disabled={pageNumber === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm">
            Page {pageNumber} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updateParams({ page: Math.min(totalPages, pageNumber + 1) })
            }
            disabled={pageNumber >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ page: totalPages })}
            disabled={pageNumber >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
