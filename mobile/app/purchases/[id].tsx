import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  CardLabel,
  CardTitle,
  Screen,
  Spinner,
  confirm,
  statusTone,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage, formatCurrency, formatDate, toNum } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function PurchaseOrderDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();
  const bId = businessId ?? '';

  const query = trpc.purchase.getPurchaseOrderById.useQuery(
    { id: id ?? '', businessId: bId },
    { enabled: !!id && !!businessId },
  );

  const invalidate = () => {
    utils.purchase.getPurchaseOrders.invalidate();
    utils.purchase.getPurchaseOrderById.invalidate({ id, businessId: bId });
  };

  const confirmOrder = trpc.purchase.confirmPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Order confirmed');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancelOrder = trpc.purchase.cancelPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Order cancelled');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteOrder = trpc.purchase.deletePurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success('Order deleted');
      utils.purchase.getPurchaseOrders.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const order = query.data;

  if (query.isLoading || !order) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Order' }} />
        <Spinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: order.documentNumber }} />
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">{order.documentNumber}</Text>
            <Text className="text-sm text-muted-foreground">{formatDate(order.orderDate)}</Text>
          </View>
          <Badge label={order.status} tone={statusTone(order.status)} />
        </View>

        <Card>
          <CardLabel>Supplier</CardLabel>
          <Text className="text-base text-foreground">{order.supplier?.name}</Text>
        </Card>

        <Card className="gap-3">
          <CardTitle>Items</CardTitle>
          {order.items?.map((item) => (
            <View key={item.id} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {item.product?.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {toNum(item.quantity)} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(toNum(item.quantity) * toNum(item.unitPrice))}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between border-t border-border pt-3">
            <Text className="text-base font-semibold text-foreground">Grand total</Text>
            <Text className="text-base font-bold text-foreground">
              {formatCurrency(order.grandTotal)}
            </Text>
          </View>
        </Card>

        {order.notes ? (
          <Card>
            <CardLabel>Notes</CardLabel>
            <Text className="text-base text-foreground">{order.notes}</Text>
          </Card>
        ) : null}

        <View className="gap-2">
          {order.status === 'DRAFT' ? (
            <Button
              label="Confirm Order"
              loading={confirmOrder.isPending}
              onPress={() =>
                confirm({
                  title: 'Confirm order?',
                  confirmLabel: 'Confirm',
                  onConfirm: () => confirmOrder.mutate({ id: order.id, businessId: bId }),
                })
              }
            />
          ) : null}
          {order.status !== 'CANCELLED' ? (
            <Button
              label="Cancel Order"
              variant="outline"
              loading={cancelOrder.isPending}
              onPress={() =>
                confirm({
                  title: 'Cancel order?',
                  confirmLabel: 'Cancel order',
                  destructive: true,
                  onConfirm: () => cancelOrder.mutate({ id: order.id, businessId: bId }),
                })
              }
            />
          ) : null}
          {order.status === 'DRAFT' ? (
            <Button
              label="Delete Order"
              variant="destructive"
              loading={deleteOrder.isPending}
              onPress={() =>
                confirm({
                  title: 'Delete order?',
                  message: 'This cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                  onConfirm: () => deleteOrder.mutate({ id: order.id, businessId: bId }),
                })
              }
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
