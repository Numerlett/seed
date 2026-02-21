'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import StockAdjustmentForm from '@/components/stockops/StockAdjustmentForm';

export default function NewAdjustmentPage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <StockAdjustmentForm />
    </>
  );
}
