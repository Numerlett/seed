'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import StockTransfersTable from '@/components/stockops/StockTransfersTable';

export default function TransfersPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <Link href="/stock-ops/transfers/new">
          <Button>
            <PlusIcon className="mr-1 h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>
      <Separator />
      <div className="p-6">
        <StockTransfersTable />
      </div>
    </>
  );
}
