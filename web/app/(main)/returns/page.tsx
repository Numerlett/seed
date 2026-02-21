'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import PurchaseReturnsTable from '@/components/returns/PurchaseReturnsTable';
import SalesReturnsTable from '@/components/returns/SalesReturnsTable';

export default function ReturnsPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <div className="flex gap-2">
          <Link href="/returns/new-purchase-return">
            <Button>
              <PlusIcon className="mr-1 h-4 w-4" />
              Purchase Return
            </Button>
          </Link>
          <Link href="/returns/new-sales-return">
            <Button variant="outline">
              <PlusIcon className="mr-1 h-4 w-4" />
              Sales Return
            </Button>
          </Link>
        </div>
      </div>
      <Separator />
      <div className="p-6">
        <Tabs defaultValue="purchase">
          <TabsList>
            <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
            <TabsTrigger value="sales">Sales Returns</TabsTrigger>
          </TabsList>
          <TabsContent value="purchase" className="mt-4">
            <PurchaseReturnsTable />
          </TabsContent>
          <TabsContent value="sales" className="mt-4">
            <SalesReturnsTable />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
