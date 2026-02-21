'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/components/shared';
import { DollarSign } from 'lucide-react';

export default function InventoryValuationCard() {
  const { activeBusiness } = useBusiness();

  const { data, isLoading } = clientTrpc.stock.getInventoryValuation.useQuery(
    { businessId: activeBusiness?.id || '' },
    { enabled: !!activeBusiness?.id },
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Total Inventory Value
        </CardTitle>
        <DollarSign className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.grandTotal ?? 0)}
            </div>
            <p className="text-muted-foreground text-xs">
              Across {data?.items?.length ?? 0} products
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
