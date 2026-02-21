'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import PurchaseOrderForm from '@/components/purchases/PurchaseOrderForm';

export default function NewPurchaseOrderPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle title="New Purchase Order" />
      </div>
      <Separator />
      <PurchaseOrderForm />
    </>
  );
}
