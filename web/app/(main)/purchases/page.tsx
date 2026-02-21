'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import PurchaseOrdersTable from '@/components/purchases/PurchaseOrdersTable';
import GRNsTable from '@/components/purchases/GRNsTable';

export default function PurchasesPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <div className="flex gap-2">
          <Link href="/purchases/new-order">
            <Button>
              <PlusIcon className="mr-1 h-4 w-4" />
              New PO
            </Button>
          </Link>
          <Link href="/purchases/new-grn">
            <Button variant="outline">
              <PlusIcon className="mr-1 h-4 w-4" />
              New GRN
            </Button>
          </Link>
        </div>
      </div>
      <Separator />
      <div className="p-6">
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="grns">Goods Receipts</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <PurchaseOrdersTable />
          </TabsContent>
          <TabsContent value="grns">
            <GRNsTable />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
