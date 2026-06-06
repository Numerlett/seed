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

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const query = trpc.sales.getSaleInvoiceById.useQuery(
    { id: id ?? '', businessId: businessId ?? '' },
    { enabled: !!id && !!businessId },
  );

  const invalidate = () => {
    utils.sales.getSaleInvoices.invalidate();
    utils.sales.getSaleInvoiceById.invalidate({ id, businessId: businessId ?? '' });
  };

  const confirmInvoice = trpc.sales.confirmSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice confirmed');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancelInvoice = trpc.sales.cancelSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice cancelled');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteInvoice = trpc.sales.deleteSaleInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice deleted');
      utils.sales.getSaleInvoices.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const invoice = query.data;

  if (query.isLoading || !invoice) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Invoice' }} />
        <Spinner />
      </Screen>
    );
  }

  const bId = businessId ?? '';

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: invoice.documentNumber }} />
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">
              {invoice.documentNumber}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {formatDate(invoice.invoiceDate)}
            </Text>
          </View>
          <View className="items-end gap-1">
            <Badge label={invoice.status} tone={statusTone(invoice.status)} />
            <Badge label={invoice.paymentStatus} tone={statusTone(invoice.paymentStatus)} />
          </View>
        </View>

        <Card className="gap-3">
          <View>
            <CardLabel>Customer</CardLabel>
            <Text className="text-base text-foreground">{invoice.customer?.name}</Text>
          </View>
          <View>
            <CardLabel>Warehouse</CardLabel>
            <Text className="text-base text-foreground">{invoice.warehouse?.name}</Text>
          </View>
        </Card>

        <Card className="gap-3">
          <CardTitle>Items</CardTitle>
          {invoice.items?.map((item) => (
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
              {formatCurrency(invoice.grandTotal)}
            </Text>
          </View>
        </Card>

        {invoice.notes ? (
          <Card>
            <CardLabel>Notes</CardLabel>
            <Text className="text-base text-foreground">{invoice.notes}</Text>
          </Card>
        ) : null}

        <View className="gap-2">
          {invoice.status === 'DRAFT' ? (
            <Button
              label="Confirm Invoice"
              loading={confirmInvoice.isPending}
              onPress={() =>
                confirm({
                  title: 'Confirm invoice?',
                  message: 'This will deduct stock and finalise the invoice.',
                  confirmLabel: 'Confirm',
                  onConfirm: () => confirmInvoice.mutate({ id: invoice.id, businessId: bId }),
                })
              }
            />
          ) : null}
          {invoice.status !== 'CANCELLED' ? (
            <Button
              label="Cancel Invoice"
              variant="outline"
              loading={cancelInvoice.isPending}
              onPress={() =>
                confirm({
                  title: 'Cancel invoice?',
                  confirmLabel: 'Cancel invoice',
                  destructive: true,
                  onConfirm: () => cancelInvoice.mutate({ id: invoice.id, businessId: bId }),
                })
              }
            />
          ) : null}
          {invoice.status === 'DRAFT' ? (
            <Button
              label="Delete Invoice"
              variant="destructive"
              loading={deleteInvoice.isPending}
              onPress={() =>
                confirm({
                  title: 'Delete invoice?',
                  message: 'This cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                  onConfirm: () => deleteInvoice.mutate({ id: invoice.id, businessId: bId }),
                })
              }
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
