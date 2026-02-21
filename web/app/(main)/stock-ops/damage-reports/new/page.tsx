'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import DamageReportForm from '@/components/stockops/DamageReportForm';

export default function NewDamageReportPage() {
  return (
    <>
      <div className="px-3">
        <PageTitle />
      </div>
      <Separator />
      <DamageReportForm />
    </>
  );
}
