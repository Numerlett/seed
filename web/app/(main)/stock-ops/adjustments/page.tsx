'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import StockAdjustmentsTable from '@/components/stockops/StockAdjustmentsTable';

export default function AdjustmentsPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <Link href="/stock-ops/adjustments/new">
          <Button>
            <PlusIcon className="mr-1 h-4 w-4" />
            New Adjustment
          </Button>
        </Link>
      </div>
      <Separator />
      <div className="p-6">
        <StockAdjustmentsTable />
      </div>
    </>
  );
}
