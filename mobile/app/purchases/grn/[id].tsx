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
} from '../../../components/ui';
import { trpc } from '../../../lib/trpc';
import { errorMessage, formatCurrency, formatDate, toNum } from '../../../lib/utils';
import { useBusiness } from '../../../providers/BusinessProvider';

export default function GRNDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();
  const bId = businessId ?? '';

  const query = trpc.purchase.getGRNById.useQuery(
    { id: id ?? '', businessId: bId },
    { enabled: !!id && !!businessId },
  );

  const invalidate = () => {
    utils.purchase.getGRNs.invalidate();
    utils.purchase.getGRNById.invalidate({ id, businessId: bId });
  };

  const confirmGRN = trpc.purchase.confirmGRN.useMutation({
    onSuccess: () => {
      toast.success('Receipt confirmed');
      invalidate();
      utils.inventory.getProducts.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancelGRN = trpc.purchase.cancelGRN.useMutation({
    onSuccess: () => {
      toast.success('Receipt cancelled');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const grn = query.data;

  if (query.isLoading || !grn) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Receipt' }} />
        <Spinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: grn.documentNumber }} />
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">{grn.documentNumber}</Text>
            <Text className="text-sm text-muted-foreground">{formatDate(grn.receivedDate)}</Text>
          </View>
          <Badge label={grn.status} tone={statusTone(grn.status)} />
        </View>

        <Card className="gap-3">
          <View>
            <CardLabel>Supplier</CardLabel>
            <Text className="text-base text-foreground">{grn.supplier?.name}</Text>
          </View>
          <View>
            <CardLabel>Warehouse</CardLabel>
            <Text className="text-base text-foreground">{grn.warehouse?.name}</Text>
          </View>
          {grn.purchaseOrder?.documentNumber ? (
            <View>
              <CardLabel>Against PO</CardLabel>
              <Text className="text-base text-foreground">
                {grn.purchaseOrder.documentNumber}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card className="gap-3">
          <CardTitle>Items received</CardTitle>
          {grn.items?.map((item) => (
            <View key={item.id} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {item.product?.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {toNum(item.quantityReceived)} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(toNum(item.quantityReceived) * toNum(item.unitPrice))}
              </Text>
            </View>
          ))}
        </Card>

        {grn.notes ? (
          <Card>
            <CardLabel>Notes</CardLabel>
            <Text className="text-base text-foreground">{grn.notes}</Text>
          </Card>
        ) : null}

        <View className="gap-2">
          {grn.status === 'DRAFT' ? (
            <Button
              label="Confirm Receipt"
              loading={confirmGRN.isPending}
              onPress={() =>
                confirm({
                  title: 'Confirm receipt?',
                  message: 'This will add the received quantities to stock.',
                  confirmLabel: 'Confirm',
                  onConfirm: () => confirmGRN.mutate({ id: grn.id, businessId: bId }),
                })
              }
            />
          ) : null}
          {grn.status !== 'CANCELLED' ? (
            <Button
              label="Cancel Receipt"
              variant="outline"
              loading={cancelGRN.isPending}
              onPress={() =>
                confirm({
                  title: 'Cancel receipt?',
                  confirmLabel: 'Cancel receipt',
                  destructive: true,
                  onConfirm: () => cancelGRN.mutate({ id: grn.id, businessId: bId }),
                })
              }
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
