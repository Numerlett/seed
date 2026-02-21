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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Layers } from 'lucide-react';
import ShelfManager from './ShelfManager';

interface WarehouseDetailSheetProps {
  warehouseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WarehouseDetailSheet({
  warehouseId,
  open,
  onOpenChange,
}: WarehouseDetailSheetProps) {
  const { activeBusiness } = useBusiness();

  const { data: warehouse, isLoading } =
    clientTrpc.warehouse.getWarehouseById.useQuery(
      { id: warehouseId || '', businessId: activeBusiness?.id || '' },
      { enabled: !!warehouseId && !!activeBusiness?.id && open },
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              warehouse?.name || 'Warehouse'
            )}
          </SheetTitle>
          <SheetDescription>Warehouse Details</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-4 p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : warehouse ? (
          <div className="mt-6 space-y-6 p-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">
                <Layers className="mr-1 h-3 w-3" />
                {warehouse._count.shelves} Shelves
              </Badge>
              <Badge variant="outline">
                {warehouse._count.stockSummaries} Stock Items
              </Badge>
            </div>

            {/* Location */}
            {warehouse.location && (
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground h-4 w-4" />
                <span>{warehouse.location}</span>
              </div>
            )}

            <Separator />

            {/* Shelf Manager */}
            <ShelfManager
              warehouseId={warehouse.id}
              shelves={warehouse.shelves}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
