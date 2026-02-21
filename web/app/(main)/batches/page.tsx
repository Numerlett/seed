'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductBatchManager from '@/components/batches/ProductBatchManager';
import ExpiringBatchesTable from '@/components/batches/ExpiringBatchesTable';

export default function BatchesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Batch Management</h1>
        <p className="text-muted-foreground">
          Manage product batches, track expiry dates, and monitor batch stock
          levels
        </p>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Product Batches</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Suspense fallback={<div>Loading...</div>}>
            <ProductBatchManager />
          </Suspense>
        </TabsContent>

        <TabsContent value="expiring" className="mt-4">
          <Suspense fallback={<div>Loading...</div>}>
            <ExpiringBatchesTable />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
