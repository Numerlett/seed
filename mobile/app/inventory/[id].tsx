import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { ProductForm } from '../../components/ProductForm';
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
import { errorMessage, formatCurrency, toNum } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

const numToStr = (n: unknown) =>
  n === null || n === undefined ? '' : String(toNum(n));

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <CardLabel>{label}</CardLabel>
      <Text className="text-base font-medium text-foreground">{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const productQuery = trpc.inventory.getProductById.useQuery(
    { id: id ?? '' },
    { enabled: !!id },
  );

  const categoriesQuery = trpc.category.getCategoriesByBusinessId.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId && editing },
  );

  const createCategory = trpc.category.createCategory.useMutation({
    onSuccess: () => {
      toast.success('Category added');
      utils.category.getCategoriesByBusinessId.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const updateProduct = trpc.inventory.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      utils.inventory.getProducts.invalidate();
      utils.inventory.getProductById.invalidate({ id });
      setEditing(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteProduct = trpc.inventory.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product deleted');
      utils.inventory.getProducts.invalidate();
      utils.dashboard.getDashboardData.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const product = productQuery.data;

  if (productQuery.isLoading || !product) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Product' }} />
        <Spinner />
      </Screen>
    );
  }

  if (editing) {
    const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
      label: c.name,
      value: c.id,
    }));
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit Product' }} />
        <ProductForm
          submitLabel="Update Product"
          submitting={updateProduct.isPending}
          categories={categoryOptions}
          onCreateCategory={(name) =>
            businessId && createCategory.mutate({ name, businessId })
          }
          initial={{
            name: product.name,
            description: product.description ?? '',
            sku: product.sku,
            barcode: product.barcode ?? '',
            brand: product.brand ?? '',
            model: product.model ?? '',
            color: product.color ?? '',
            size: product.size ?? '',
            weight: numToStr(product.weight),
            dimensions: product.dimensions ?? '',
            image: product.image ?? undefined,
            unit: product.unit,
            secondaryUnit: product.secondaryUnit ?? '',
            unitConvertion: numToStr(product.unitConvertion),
            currentStockLevel: numToStr(product.currentStockLevel),
            minStockLevel: numToStr(product.minStockLevel),
            maxStockLevel: numToStr(product.maxStockLevel),
            reorderLevel: numToStr(product.reorderLevel),
            costPrice: numToStr(product.costPrice),
            sellingPrice: numToStr(product.sellingPrice),
            mrp: numToStr(product.mrp),
            taxRate: numToStr(product.taxRate),
            discountRate: numToStr(product.discountRate),
            isActive: product.isActive,
            isService: product.isService,
            allowNegative: product.allowNegative,
            categoryId: product.categoryId ?? undefined,
          }}
          onSubmit={(payload) => updateProduct.mutate({ id: product.id, data: payload })}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Product' }} />
      <View className="gap-4">
        <View className="flex-row items-center gap-3">
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={{ width: 64, height: 64, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : null}
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{product.name}</Text>
            <Text className="text-sm text-muted-foreground">{product.sku}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Badge label={product.isActive ? 'Active' : 'Inactive'} tone={product.isActive ? 'success' : 'neutral'} />
          {product.isService ? <Badge label="Service" tone="info" /> : null}
          {product.category?.name ? <Badge label={product.category.name} /> : null}
        </View>

        <Card className="gap-3">
          <View className="flex-row gap-3">
            <DetailRow label="Selling price" value={formatCurrency(product.sellingPrice)} />
            <DetailRow label="Cost price" value={formatCurrency(product.costPrice)} />
          </View>
          <View className="flex-row gap-3">
            <DetailRow label="MRP" value={product.mrp ? formatCurrency(product.mrp) : '—'} />
            <DetailRow label="Tax" value={`${product.taxRate}%`} />
          </View>
        </Card>

        <Card className="gap-3">
          <View className="flex-row gap-3">
            <DetailRow label="In stock" value={`${toNum(product.currentStockLevel)} ${product.unit}`} />
            <DetailRow label="Reorder at" value={numToStr(product.reorderLevel) || '—'} />
          </View>
          <View className="flex-row gap-3">
            <DetailRow label="Min" value={numToStr(product.minStockLevel) || '—'} />
            <DetailRow label="Max" value={numToStr(product.maxStockLevel) || '—'} />
          </View>
        </Card>

        {product.description ? (
          <Card>
            <CardLabel>Description</CardLabel>
            <Text className="text-base text-foreground">{product.description}</Text>
          </Card>
        ) : null}

        <View className="gap-2">
          <Button label="Edit Product" onPress={() => setEditing(true)} />
          <Button
            label="Delete Product"
            variant="destructive"
            loading={deleteProduct.isPending}
            onPress={() =>
              confirm({
                title: 'Delete product?',
                message: 'This cannot be undone.',
                confirmLabel: 'Delete',
                destructive: true,
                onConfirm: () => deleteProduct.mutate({ id: product.id }),
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
