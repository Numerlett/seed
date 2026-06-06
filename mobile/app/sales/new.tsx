import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';

import {
  LineItemsEditor,
  type LineItem,
} from '../../components/LineItemsEditor';
import {
  Button,
  Card,
  CardTitle,
  Field,
  Screen,
  Select,
  Spinner,
  TextArea,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { useLineItemData } from '../../lib/useLineItemData';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const toast = useToast();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const { products, customers, warehouses, loading } = useLineItemData(
    businessId ?? '',
  );

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');

  const createInvoice = trpc.sales.createSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice created');
      utils.sales.getSaleInvoices.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSubmit = () => {
    if (!customerId) return toast.error('Select a customer');
    if (!warehouseId) return toast.error('Select a warehouse');
    if (items.length === 0) return toast.error('Add at least one item');
    if (!businessId) return;
    createInvoice.mutate({
      businessId,
      customerId,
      warehouseId,
      notes: notes.trim() || undefined,
      items,
    });
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New Invoice' }} />
        <Spinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Invoice' }} />
      <Card className="mb-4 gap-3">
        <CardTitle>Details</CardTitle>
        <Field label="Customer" required>
          <Select
            value={customerId}
            options={customers}
            onChange={setCustomerId}
            placeholder={customers.length ? 'Select customer' : 'No customers — add one first'}
            title="Select customer"
          />
        </Field>
        <Field label="Warehouse" required>
          <Select
            value={warehouseId}
            options={warehouses}
            onChange={setWarehouseId}
            placeholder={warehouses.length ? 'Select warehouse' : 'No warehouses — add one first'}
            title="Select warehouse"
          />
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChangeText={setNotes} placeholder="Optional notes" />
        </Field>
      </Card>

      <LineItemsEditor
        products={products}
        items={items}
        onChange={setItems}
        priceField="selling"
      />

      <Button
        className="mt-4"
        label="Create Invoice"
        loading={createInvoice.isPending}
        onPress={onSubmit}
      />
    </Screen>
  );
}
