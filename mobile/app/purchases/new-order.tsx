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

export default function NewPurchaseOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const { products, suppliers, loading } = useLineItemData(businessId ?? '');

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');

  const createOrder = trpc.purchase.createPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Purchase order created');
      utils.purchase.getPurchaseOrders.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSubmit = () => {
    if (!supplierId) return toast.error('Select a supplier');
    if (items.length === 0) return toast.error('Add at least one item');
    if (!businessId) return;
    createOrder.mutate({
      businessId,
      supplierId,
      notes: notes.trim() || undefined,
      items,
    });
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New Order' }} />
        <Spinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Purchase Order' }} />
      <Card className="mb-4 gap-3">
        <CardTitle>Details</CardTitle>
        <Field label="Supplier" required>
          <Select
            value={supplierId}
            options={suppliers}
            onChange={setSupplierId}
            placeholder={suppliers.length ? 'Select supplier' : 'No suppliers — add one first'}
            title="Select supplier"
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
        priceField="cost"
      />

      <Button
        className="mt-4"
        label="Create Order"
        loading={createOrder.isPending}
        onPress={onSubmit}
      />
    </Screen>
  );
}
