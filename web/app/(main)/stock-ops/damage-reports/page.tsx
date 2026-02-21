'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import DamageReportsTable from '@/components/stockops/DamageReportsTable';

export default function DamageReportsPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <Link href="/stock-ops/damage-reports/new">
          <Button>
            <PlusIcon className="mr-1 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>
      <Separator />
      <div className="p-6">
        <DamageReportsTable />
      </div>
    </>
  );
}
