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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/components/shared';
import { WarehouseSelector } from '@/components/shared/WarehouseSelector';
import ProductLedgerSheet from './ProductLedgerSheet';
import { useState } from 'react';

export default function StockSummaryTable() {
  const { activeBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [ledgerProductId, setLedgerProductId] = useState<string | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const getParam = (key: string, defaultVal: string) =>
    searchParams.get(key) || defaultVal;

  const pageNumber = parseInt(getParam('page', '1'));
  const pageSize = parseInt(getParam('pageSize', '20'));
  const warehouseId = getParam('warehouseId', '');
  const hideZeroStock = getParam('hideZero', 'true') === 'true';

  const { data, isLoading, isError } =
    clientTrpc.stock.getStockSummary.useQuery(
      {
        businessId: activeBusiness?.id || '',
        warehouseId: warehouseId || undefined,
        hideZeroStock,
        pageSize,
        pageNumber,
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

  if (!activeBusiness) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <WarehouseSelector
          value={warehouseId || 'all'}
          onValueChange={(val) => updateParams({ warehouseId: val, page: 1 })}
          includeAll
          className="w-50"
        />
        <Select
          value={hideZeroStock ? 'true' : 'false'}
          onValueChange={(val) => updateParams({ hideZero: val, page: 1 })}
        >
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Hide Zero Stock</SelectItem>
            <SelectItem value="false">Show All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Shelf</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value</TableHead>
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
                  Error loading stock data
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  No stock data found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setLedgerProductId(item.productId);
                    setIsLedgerOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {item.product.name}
                  </TableCell>
                  <TableCell>{item.product.sku || '—'}</TableCell>
                  <TableCell>{item.warehouse.name}</TableCell>
                  <TableCell>{item.shelf?.shelfCode || '—'}</TableCell>
                  <TableCell>
                    {item.batch ? (
                      <div className="flex items-center gap-1">
                        {item.batch.batchNumber}
                        {item.batch.isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {String(item.currentQuantity)} {item.product.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.currentValue)}
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
          Showing {items.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{' '}
          {Math.min(pageNumber * pageSize, total)} of {total} entries
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) =>
                updateParams({ pageSize: value, page: 1 })
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
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
              onClick={() =>
                updateParams({ page: Math.max(1, pageNumber - 1) })
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

      {/* Product Ledger Sheet */}
      <ProductLedgerSheet
        productId={ledgerProductId}
        open={isLedgerOpen}
        onOpenChange={setIsLedgerOpen}
      />
    </div>
  );
}
