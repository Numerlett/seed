'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import WarehousesTable from '@/components/warehouses/WarehousesTable';

export default function WarehousesPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
      </div>
      <Separator />
      <WarehousesTable />
    </>
  );
}
