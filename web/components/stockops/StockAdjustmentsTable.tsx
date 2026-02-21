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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchParams, useRouter } from 'next/navigation';
import { StatusBadge, formatDate } from '@/components/shared';
import { useState } from 'react';
import StockAdjustmentDetailSheet from './StockAdjustmentDetailSheet';
import type { StockAdjustmentListItem } from '@/types/stockops';

export default function StockAdjustmentsTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selected, setSelected] = useState<StockAdjustmentListItem | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const pageNumber = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const { data, isLoading, isError } =
    clientTrpc.stockops.getStockAdjustments.useQuery(
      {
        businessId: activeBusiness?.id || '',
        pageSize,
        pageNumber,
        status:
          status && status !== 'all'
            ? (status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED')
            : undefined,
        search: search || undefined,
      },
      { enabled: !!activeBusiness?.id },
    );

  const items = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total || 0;

  const updateParams = (
    params: Record<string, string | number | undefined>,
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.replace(`?${newParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by document number..."
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
            className="pl-9"
          />
        </div>
        <Select
          value={status || 'all'}
          onValueChange={(val) => updateParams({ status: val, page: 1 })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document #</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-500">
                  Error loading adjustments
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground text-center"
                >
                  No stock adjustments found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(item);
                    setIsSheetOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {item.documentNumber}
                  </TableCell>
                  <TableCell>{item.warehouse?.name || '—'}</TableCell>
                  <TableCell>{formatDate(item.adjustmentDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item._count.items}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {items.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{' '}
          {Math.min(pageNumber * pageSize, total)} of {total} adjustments
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

      <StockAdjustmentDetailSheet
        adjustment={selected}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
