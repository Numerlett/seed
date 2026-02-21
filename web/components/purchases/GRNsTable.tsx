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
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared';
import { useState } from 'react';
import GRNDetailSheet from './GRNDetailSheet';
import type { GRNListItem } from '@/types/purchase';

export default function GRNsTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedGRN, setSelectedGRN] = useState<GRNListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getParam = (key: string, defaultVal: string) =>
    searchParams.get(key) || defaultVal;

  const pageNumber = parseInt(getParam('grnPage', '1'));
  const pageSize = parseInt(getParam('grnPageSize', '20'));
  const status = getParam('grnStatus', '');

  const { data, isLoading, isError } = clientTrpc.purchase.getGRNs.useQuery(
    {
      businessId: activeBusiness?.id || '',
      pageSize,
      pageNumber,
      status:
        status && status !== 'all'
          ? (status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED')
          : undefined,
    },
    { enabled: !!activeBusiness?.id },
  );

  const grns = data?.data || [];
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
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Select
          value={status || 'all'}
          onValueChange={(val) => updateParams({ grnStatus: val, grnPage: 1 })}
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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>PO Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-500">
                  Error loading GRNs
                </TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  No goods receipt notes found
                </TableCell>
              </TableRow>
            ) : (
              grns.map((grn) => (
                <TableRow
                  key={grn.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedGRN(grn);
                    setIsSheetOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {grn.documentNumber}
                  </TableCell>
                  <TableCell>{grn.supplier?.name || '—'}</TableCell>
                  <TableCell>{grn.warehouse?.name || '—'}</TableCell>
                  <TableCell>
                    {grn.purchaseOrder?.documentNumber || '—'}
                  </TableCell>
                  <TableCell>{formatDate(grn.receivedDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell>{grn._count.items}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {grns.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{' '}
          {Math.min(pageNumber * pageSize, total)} of {total} GRNs
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ grnPage: 1 })}
            disabled={pageNumber === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updateParams({ grnPage: Math.max(1, pageNumber - 1) })
            }
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
              updateParams({ grnPage: Math.min(totalPages, pageNumber + 1) })
            }
            disabled={pageNumber >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ grnPage: totalPages })}
            disabled={pageNumber >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Sheet */}
      <GRNDetailSheet
        grn={selectedGRN}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
