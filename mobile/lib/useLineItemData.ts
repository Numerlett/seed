import type { LineItemProduct } from '../components/LineItemsEditor';
import type { SelectOption } from '../components/ui';
import { trpc } from './trpc';
import { toNum } from './utils';

/**
 * Loads the reference data needed to build sales/purchase documents:
 * products (as line-item products) plus customer/supplier/warehouse options.
 */
export function useLineItemData(businessId: string) {
  const enabled = !!businessId;
  const productsQuery = trpc.inventory.getProducts.useQuery(
    { businessId, pageSize: 100 },
    { enabled },
  );
  const partiesQuery = trpc.party.getPartiesByBusinessId.useQuery(
    { businessId, pageSize: 100 },
    { enabled },
  );
  const warehousesQuery = trpc.warehouse.getWarehouses.useQuery(
    { businessId },
    { enabled },
  );

  const products: LineItemProduct[] = (productsQuery.data?.products ?? []).map(
    (p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      sellingPrice: toNum(p.sellingPrice),
      costPrice: toNum(p.costPrice),
      taxRate: toNum(p.taxRate),
    }),
  );

  const parties = partiesQuery.data?.parties ?? [];
  const toOption = (p: { id: string; name: string }): SelectOption => ({
    label: p.name,
    value: p.id,
  });

  const customers = parties
    .filter((p) => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH')
    .map(toOption);
  const suppliers = parties
    .filter((p) => p.partyType === 'SUPPLIER' || p.partyType === 'BOTH')
    .map(toOption);

  const warehouses: SelectOption[] = (warehousesQuery.data ?? []).map((w) => ({
    label: w.name,
    value: w.id,
  }));

  return {
    products,
    customers,
    suppliers,
    warehouses,
    loading:
      productsQuery.isLoading ||
      partiesQuery.isLoading ||
      warehousesQuery.isLoading,
  };
}
