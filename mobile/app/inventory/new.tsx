import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { ProductForm } from '../../components/ProductForm';
import { Screen, useToast } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function NewProductScreen() {
  const router = useRouter();
  const toast = useToast();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const categoriesQuery = trpc.category.getCategoriesByBusinessId.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  const createCategory = trpc.category.createCategory.useMutation({
    onSuccess: () => {
      toast.success('Category added');
      utils.category.getCategoriesByBusinessId.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const addProduct = trpc.inventory.addProduct.useMutation({
    onSuccess: () => {
      toast.success('Product created');
      utils.inventory.getProducts.invalidate();
      utils.dashboard.getDashboardData.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Product' }} />
      <ProductForm
        categories={categoryOptions}
        onCreateCategory={(name) =>
          businessId && createCategory.mutate({ name, businessId })
        }
        submitting={addProduct.isPending}
        onSubmit={(payload) =>
          businessId && addProduct.mutate({ ...payload, businessId })
        }
      />
    </Screen>
  );
}
