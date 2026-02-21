'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye } from 'lucide-react';
import { ProductSelector } from '@/components/shared';
import { formatCurrency, formatDate } from '@/components/shared';
import BatchForm from './BatchForm';
import BatchDetailSheet from './BatchDetailSheet';

export default function ProductBatchManager() {
  const { activeBusiness } = useBusiness();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: batches, isLoading } =
    clientTrpc.batch.getBatchesByProduct.useQuery(
      {
        productId: selectedProductId,
        businessId: activeBusiness?.id || '',
        search: search || undefined,
      },
      { enabled: !!selectedProductId && !!activeBusiness?.id },
    );

  const filteredBatches = batches || [];

  const handleCreate = () => {
    setEditingBatch(null);
    setFormOpen(true);
  };

  const handleEdit = (batch: any) => {
    setEditingBatch(batch);
    setFormOpen(true);
    setDetailOpen(false);
  };

  const handleViewDetail = (batchId: string) => {
    setDetailBatchId(batchId);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium">
            Select Product
          </label>
          <ProductSelector
            value={selectedProductId}
            onValueChange={(val: string) => {
              setSelectedProductId(val);
              setSearch('');
            }}
          />
        </div>

        {selectedProductId && (
          <>
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search batches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Batch
            </Button>
          </>
        )}
      </div>

      {!selectedProductId ? (
        <div className="text-muted-foreground rounded-md border py-12 text-center">
          Select a product above to manage its batches
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Mfg. Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground text-center"
                  >
                    No batches found for this product
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch: any) => {
                  const stockCount = batch._count?.stockSummaries ?? 0;

                  return (
                    <TableRow
                      key={batch.id}
                      className="cursor-pointer"
                      onClick={() => handleViewDetail(batch.id)}
                    >
                      <TableCell className="font-medium">
                        {batch.batchNumber}
                      </TableCell>
                      <TableCell>
                        {batch.manufacturingDate
                          ? formatDate(batch.manufacturingDate)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(batch.purchasePrice)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            batch.isExpired ? 'destructive' : 'secondary'
                          }
                        >
                          {batch.isExpired ? 'Expired' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {stockCount} location{stockCount !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(batch.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Batch Form (Create / Edit) */}
      <BatchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        batch={editingBatch}
        productId={selectedProductId}
      />

      {/* Batch Detail Sheet */}
      <BatchDetailSheet
        batchId={detailBatchId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
      />
    </div>
  );
}
