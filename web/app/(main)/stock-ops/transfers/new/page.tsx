'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import StockTransferForm from '@/components/stockops/StockTransferForm';

export default function NewTransferPage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <StockTransferForm />
    </>
  );
}
