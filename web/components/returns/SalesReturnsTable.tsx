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
import SalesReturnDetailSheet from './SalesReturnDetailSheet';
import type { SalesReturnListItem } from '@/types/returns';

export default function SalesReturnsTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedReturn, setSelectedReturn] =
    useState<SalesReturnListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const pageNumber = parseInt(searchParams.get('srPage') || '1');
  const pageSize = parseInt(searchParams.get('srPageSize') || '20');
  const status = searchParams.get('srStatus') || '';
  const search = searchParams.get('srSearch') || '';

  const { data, isLoading, isError } =
    clientTrpc.returns.getSalesReturns.useQuery(
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

  const returns = data?.data || [];
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
            onChange={(e) =>
              updateParams({ srSearch: e.target.value, srPage: 1 })
            }
            className="pl-9"
          />
        </div>
        <Select
          value={status || 'all'}
          onValueChange={(val) => updateParams({ srStatus: val, srPage: 1 })}
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
              <TableHead>Customer</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
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
                  Error loading sales returns
                </TableCell>
              </TableRow>
            ) : returns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  No sales returns found
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow
                  key={ret.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedReturn(ret);
                    setIsSheetOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {ret.documentNumber}
                  </TableCell>
                  <TableCell>{ret.customer?.name || '—'}</TableCell>
                  <TableCell>{ret.warehouse?.name || '—'}</TableCell>
                  <TableCell>{formatDate(ret.returnDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={ret.status} />
                  </TableCell>
                  <TableCell>{ret._count.items}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ret.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {returns.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1}{' '}
          to {Math.min(pageNumber * pageSize, total)} of {total} returns
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ srPage: 1 })}
            disabled={pageNumber === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updateParams({ srPage: Math.max(1, pageNumber - 1) })
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
              updateParams({ srPage: Math.min(totalPages, pageNumber + 1) })
            }
            disabled={pageNumber >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateParams({ srPage: totalPages })}
            disabled={pageNumber >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SalesReturnDetailSheet
        returnItem={selectedReturn}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
