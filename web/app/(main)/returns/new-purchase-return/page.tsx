'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import PurchaseReturnForm from '@/components/returns/PurchaseReturnForm';

export default function NewPurchaseReturnPage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <PurchaseReturnForm />
    </>
  );
}
