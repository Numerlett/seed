'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import GRNForm from '@/components/purchases/GRNForm';

export default function NewGRNPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle title="New Goods Receipt" />
      </div>
      <Separator />
      <GRNForm />
    </>
  );
}
