import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { WarehouseForm } from '../../components/WarehouseForm';
import {
  Badge,
  Button,
  Card,
  CardLabel,
  Screen,
  Spinner,
  confirm,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function WarehouseDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const query = trpc.warehouse.getWarehouseById.useQuery(
    { id: id ?? '', businessId: businessId ?? '' },
    { enabled: !!id && !!businessId },
  );

  const updateWarehouse = trpc.warehouse.updateWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse updated');
      utils.warehouse.getWarehouses.invalidate();
      utils.warehouse.getWarehouseById.invalidate({ id, businessId: businessId ?? '' });
      setEditing(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteWarehouse = trpc.warehouse.deleteWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse deleted');
      utils.warehouse.getWarehouses.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const warehouse = query.data;

  if (query.isLoading || !warehouse) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Warehouse' }} />
        <Spinner />
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit Warehouse' }} />
        <WarehouseForm
          submitLabel="Update Warehouse"
          submitting={updateWarehouse.isPending}
          initial={{
            name: warehouse.name,
            location: warehouse.location ?? '',
            isActive: warehouse.isActive,
          }}
          onSubmit={(payload) =>
            businessId &&
            updateWarehouse.mutate({ id: warehouse.id, businessId, data: payload })
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Warehouse' }} />
      <View className="gap-4">
        <View>
          <Text className="text-xl font-bold text-foreground">{warehouse.name}</Text>
          <Badge
            className="mt-1"
            label={warehouse.isActive ? 'Active' : 'Inactive'}
            tone={warehouse.isActive ? 'success' : 'neutral'}
          />
        </View>

        <Card className="gap-3">
          <View>
            <CardLabel>Location</CardLabel>
            <Text className="text-base text-foreground">
              {warehouse.location || '—'}
            </Text>
          </View>
          <View>
            <CardLabel>Shelves</CardLabel>
            <Text className="text-base text-foreground">
              {warehouse._count?.shelves ?? 0}
            </Text>
          </View>
        </Card>

        <View className="gap-2">
          <Button label="Edit Warehouse" onPress={() => setEditing(true)} />
          <Button
            label="Delete Warehouse"
            variant="destructive"
            loading={deleteWarehouse.isPending}
            onPress={() =>
              confirm({
                title: 'Delete warehouse?',
                message: 'Warehouses with stock cannot be deleted.',
                confirmLabel: 'Delete',
                destructive: true,
                onConfirm: () =>
                  businessId &&
                  deleteWarehouse.mutate({ id: warehouse.id, businessId }),
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
