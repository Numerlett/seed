'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import SaleInvoiceForm from '@/components/sales/SaleInvoiceForm';

export default function NewSaleInvoicePage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <SaleInvoiceForm />
    </>
  );
}
