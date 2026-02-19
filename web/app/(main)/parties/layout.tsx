'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import PageTitle from '@/components/main/PageTitle';
import { Button } from '@/components/ui/button';
import AddPartyDialog from '@/components/parties/AddPartyDialog';
import { useMemo } from 'react';
import { ButtonGroup } from '@/components/ui/button-group';

export default function PartiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { type } = useParams();
  const router = useRouter();

  const isCustomers = type === 'customers';
  const isSuppliers = type === 'suppliers';

  if (!isCustomers && !isSuppliers) return notFound();

  const title = useMemo(() => {
    if (isCustomers) return 'Parties: Customers';
    if (isSuppliers) return 'Parties: Suppliers';
    return 'Parties';
  }, [isCustomers, isSuppliers]);

  const changePartyType = () => {
    if (isCustomers) {
      router.push('/parties/suppliers');
    } else {
      router.push('/parties/customers');
    }
  };

  return (
    <>
      <div className="bg-background sticky top-0 z-10 flex flex-row items-center justify-between border-b px-3">
        <PageTitle title={title} />
        <AddPartyDialog type={type as 'customers' | 'suppliers'} />
      </div>
      <ButtonGroup className="flex w-full flex-row items-center px-3 pt-3">
        <Button
          variant={isCustomers ? 'default' : 'outline'}
          onClick={changePartyType}
          className="flex-1"
        >
          Customers
        </Button>
        <Button
          variant={isSuppliers ? 'default' : 'outline'}
          onClick={changePartyType}
          className="flex-1"
        >
          Suppliers
        </Button>
      </ButtonGroup>
      {children}
    </>
  );
}
