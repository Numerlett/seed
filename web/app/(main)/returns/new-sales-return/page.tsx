'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import SalesReturnForm from '@/components/returns/SalesReturnForm';

export default function NewSalesReturnPage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <SalesReturnForm />
    </>
  );
}
