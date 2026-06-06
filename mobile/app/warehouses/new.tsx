import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { WarehouseForm } from '../../components/WarehouseForm';
import { Screen, useToast } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function NewWarehouseScreen() {
  const router = useRouter();
  const toast = useToast();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const createWarehouse = trpc.warehouse.createWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse created');
      utils.warehouse.getWarehouses.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Warehouse' }} />
      <WarehouseForm
        submitLabel="Create Warehouse"
        submitting={createWarehouse.isPending}
        onSubmit={(payload) =>
          businessId && createWarehouse.mutate({ ...payload, businessId })
        }
      />
    </Screen>
  );
}
