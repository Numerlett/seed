import { Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, CardTitle, Select, type SelectOption } from './ui';
import { cn, formatCurrency, toNum } from '../lib/utils';

export interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface LineItemProduct {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
}

export function computeLineTotal(item: LineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmt = (subtotal * item.discount) / 100;
  const taxable = subtotal - discountAmt;
  const taxAmt = (taxable * item.taxRate) / 100;
  return taxable + taxAmt;
}

export function computeGrandTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + computeLineTotal(i), 0);
}

function NumberCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] text-muted-foreground">{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(t) => onChange(toNum(t))}
        keyboardType="decimal-pad"
        selectTextOnFocus
        className="h-10 rounded-lg border border-input bg-background px-2 text-center text-sm text-foreground"
      />
    </View>
  );
}

export function LineItemsEditor({
  products,
  items,
  onChange,
  priceField = 'selling',
}: {
  products: LineItemProduct[];
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  priceField?: 'selling' | 'cost';
}) {
  const [adding, setAdding] = useState(false);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const options: SelectOption[] = products.map((p) => ({
    label: p.name,
    value: p.id,
    subtitle: p.sku,
  }));

  const addProduct = (productId: string) => {
    const p = productMap.get(productId);
    if (!p) return;
    onChange([
      ...items,
      {
        productId,
        quantity: 1,
        unitPrice: priceField === 'cost' ? p.costPrice : p.sellingPrice,
        taxRate: p.taxRate ?? 0,
        discount: 0,
      },
    ]);
    setAdding(false);
  };

  const update = (index: number, patch: Partial<LineItem>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <CardTitle>Items</CardTitle>
        <Text className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {items.map((item, index) => {
        const p = productMap.get(item.productId);
        return (
          <View key={`${item.productId}-${index}`} className="gap-2 rounded-xl border border-border p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {p?.name ?? 'Product'}
                </Text>
                <Text className="text-xs text-muted-foreground">{p?.sku}</Text>
              </View>
              <Pressable onPress={() => remove(index)} className="p-1">
                <Trash2 size={16} color="#dc2626" />
              </Pressable>
            </View>
            <View className="flex-row gap-2">
              <NumberCell label="Qty" value={item.quantity} onChange={(n) => update(index, { quantity: n })} />
              <NumberCell label="Price" value={item.unitPrice} onChange={(n) => update(index, { unitPrice: n })} />
              <NumberCell label="Tax %" value={item.taxRate} onChange={(n) => update(index, { taxRate: n })} />
              <NumberCell label="Disc %" value={item.discount} onChange={(n) => update(index, { discount: n })} />
            </View>
            <Text className="text-right text-sm font-semibold text-foreground">
              {formatCurrency(computeLineTotal(item))}
            </Text>
          </View>
        );
      })}

      {adding ? (
        <Select
          value={null}
          options={options}
          onChange={addProduct}
          placeholder="Choose a product"
          title="Add product"
        />
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 active:opacity-70"
        >
          <Plus size={18} color="#1c1917" />
          <Text className="font-medium text-foreground">Add item</Text>
        </Pressable>
      )}

      <View className={cn('flex-row items-center justify-between border-t border-border pt-3')}>
        <Text className="text-base font-semibold text-foreground">Total</Text>
        <Text className="text-base font-bold text-foreground">
          {formatCurrency(computeGrandTotal(items))}
        </Text>
      </View>
    </Card>
  );
}
