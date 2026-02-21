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
  ArrowUpDown,
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
import PurchaseOrderDetailSheet from './PurchaseOrderDetailSheet';
import type { PurchaseOrderListItem } from '@/types/purchase';

export default function PurchaseOrdersTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedPO, setSelectedPO] = useState<PurchaseOrderListItem | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getParam = (key: string, defaultVal: string) =>
    searchParams.get(key) || defaultVal;

  const pageNumber = parseInt(getParam('page', '1'));
  const pageSize = parseInt(getParam('pageSize', '20'));
  const status = getParam('status', '');
  const search = getParam('search', '');

  const { data, isLoading, isError } =
    clientTrpc.purchase.getPurchaseOrders.useQuery(
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

  const orders = data?.data || [];
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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document #</TableHead>
              <TableHead>Supplier</TableHead>
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
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-red-500">
                  Error loading purchase orders
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground text-center"
                >
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedPO(order);
                    setIsSheetOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {order.documentNumber}
                  </TableCell>
                  <TableCell>{order.supplier?.name || '—'}</TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{order._count.items}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {orders.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{' '}
          {Math.min(pageNumber * pageSize, total)} of {total} orders
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

      {/* Detail Sheet */}
      <PurchaseOrderDetailSheet
        order={selectedPO}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
