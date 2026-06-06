import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type productSchema } from '@seed/schemas';
import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import * as z from 'zod';

import { Button, Card, CardTitle, Input, type SelectOption } from './ui';
import { ControlledInput } from './form/ControlledInput';
import { ControlledSelect } from './form/ControlledSelect';
import { ControlledToggle } from './form/ControlledToggle';
import { ImageUploadField } from './ImageUploadField';
import { toNumber, toOptionalNumber } from '../lib/utils';

type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductPayload = Omit<z.infer<typeof productSchema>, 'businessId'>;

const emptyToUndef = (v?: string) =>
  v === undefined || v.trim() === '' ? undefined : v;

function toPayload(v: ProductFormValues): ProductPayload {
  return {
    name: v.name,
    description: emptyToUndef(v.description),
    sku: v.sku,
    barcode: emptyToUndef(v.barcode),
    brand: emptyToUndef(v.brand),
    model: emptyToUndef(v.model),
    color: emptyToUndef(v.color),
    size: emptyToUndef(v.size),
    weight: toOptionalNumber(v.weight),
    dimensions: emptyToUndef(v.dimensions),
    image: emptyToUndef(v.image),
    unit: v.unit || 'pcs',
    secondaryUnit: emptyToUndef(v.secondaryUnit),
    unitConvertion: toOptionalNumber(v.unitConvertion),
    currentStockLevel: toNumber(v.currentStockLevel, 0),
    minStockLevel: toOptionalNumber(v.minStockLevel),
    maxStockLevel: toOptionalNumber(v.maxStockLevel),
    reorderLevel: toOptionalNumber(v.reorderLevel),
    costPrice: toNumber(v.costPrice, 0),
    sellingPrice: toNumber(v.sellingPrice, 0),
    mrp: toOptionalNumber(v.mrp),
    taxRate: toNumber(v.taxRate, 0),
    discountRate: toNumber(v.discountRate, 0),
    isActive: v.isActive,
    isService: v.isService,
    allowNegative: v.allowNegative,
    categoryId: emptyToUndef(v.categoryId),
  };
}

function defaults(initial?: Partial<ProductFormValues>): ProductFormValues {
  return {
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sku: initial?.sku ?? '',
    barcode: initial?.barcode ?? '',
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    color: initial?.color ?? '',
    size: initial?.size ?? '',
    weight: initial?.weight ?? '',
    dimensions: initial?.dimensions ?? '',
    image: initial?.image,
    attachments: initial?.attachments,
    unit: initial?.unit ?? 'pcs',
    secondaryUnit: initial?.secondaryUnit ?? '',
    unitConvertion: initial?.unitConvertion ?? '',
    currentStockLevel: initial?.currentStockLevel ?? '0',
    minStockLevel: initial?.minStockLevel ?? '',
    maxStockLevel: initial?.maxStockLevel ?? '',
    reorderLevel: initial?.reorderLevel ?? '',
    costPrice: initial?.costPrice ?? '',
    sellingPrice: initial?.sellingPrice ?? '',
    mrp: initial?.mrp ?? '',
    taxRate: initial?.taxRate ?? '0',
    discountRate: initial?.discountRate ?? '0',
    isActive: initial?.isActive ?? true,
    isService: initial?.isService ?? false,
    allowNegative: initial?.allowNegative ?? false,
    categoryId: initial?.categoryId,
  };
}

export function ProductForm({
  initial,
  categories,
  onCreateCategory,
  onSubmit,
  submitting,
  submitLabel = 'Save Product',
}: {
  initial?: Partial<ProductFormValues>;
  categories: SelectOption[];
  onCreateCategory?: (name: string) => void;
  onSubmit: (payload: ProductPayload) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { control, handleSubmit } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults(initial),
  });

  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  return (
    <View className="gap-4">
      <Card className="gap-3">
        <CardTitle>Basics</CardTitle>
        <ControlledInput control={control} name="name" label="Name" required placeholder="Product name" />
        <ControlledInput control={control} name="sku" label="SKU" required placeholder="SKU-001" autoCapitalize="characters" />
        <ControlledInput control={control} name="barcode" label="Barcode" placeholder="Barcode" />
        <ControlledInput control={control} name="description" label="Description" placeholder="Short description" multiline />

        <ControlledSelect
          control={control}
          name="categoryId"
          label="Category"
          placeholder="No category"
          title="Select category"
          options={categories}
        />
        {onCreateCategory ? (
          addingCategory ? (
            <View className="flex-row gap-2">
              <Input
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="New category name"
                className="flex-1"
              />
              <Button
                label="Add"
                fullWidth={false}
                onPress={() => {
                  if (newCategory.trim()) {
                    onCreateCategory(newCategory.trim());
                    setNewCategory('');
                    setAddingCategory(false);
                  }
                }}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setAddingCategory(true)}
              className="flex-row items-center gap-1 self-start py-1"
            >
              <Plus size={16} color="#1c1917" />
              <Text className="text-sm font-medium text-primary">New category</Text>
            </Pressable>
          )
        ) : null}
      </Card>

      <Card className="gap-3">
        <CardTitle>Pricing</CardTitle>
        <ControlledInput control={control} name="costPrice" label="Cost price" required keyboardType="decimal-pad" placeholder="0.00" />
        <ControlledInput control={control} name="sellingPrice" label="Selling price" required keyboardType="decimal-pad" placeholder="0.00" />
        <ControlledInput control={control} name="mrp" label="MRP" keyboardType="decimal-pad" placeholder="0.00" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="taxRate" label="Tax %" keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="discountRate" label="Discount %" keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
      </Card>

      <Card className="gap-3">
        <CardTitle>Stock</CardTitle>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="currentStockLevel" label="Current" keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="reorderLevel" label="Reorder at" keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="minStockLevel" label="Min" keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="maxStockLevel" label="Max" keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="unit" label="Unit" placeholder="pcs" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="weight" label="Weight" keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
      </Card>

      <Card className="gap-3">
        <CardTitle>Details</CardTitle>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="brand" label="Brand" placeholder="Brand" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="model" label="Model" placeholder="Model" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ControlledInput control={control} name="color" label="Color" placeholder="Color" />
          </View>
          <View className="flex-1">
            <ControlledInput control={control} name="size" label="Size" placeholder="Size" />
          </View>
        </View>
        <Controller
          control={control}
          name="image"
          render={({ field: { value, onChange } }) => (
            <ImageUploadField value={value} onChange={onChange} />
          )}
        />
      </Card>

      <Card className="gap-3">
        <CardTitle>Settings</CardTitle>
        <ControlledToggle control={control} name="isActive" label="Active" description="Show this product in lists" />
        <ControlledToggle control={control} name="isService" label="Service item" description="Not tracked as physical stock" />
        <ControlledToggle control={control} name="allowNegative" label="Allow negative stock" />
      </Card>

      <Button
        label={submitLabel}
        loading={submitting}
        onPress={handleSubmit((v) => onSubmit(toPayload(v)))}
      />
    </View>
  );
}
