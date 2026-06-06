import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import * as z from 'zod';

import { Button, Card, CardTitle } from './ui';
import { ControlledInput } from './form/ControlledInput';
import { ControlledToggle } from './form/ControlledToggle';

const warehouseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  isActive: z.boolean(),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export interface WarehousePayload {
  name: string;
  location?: string;
  isActive: boolean;
}

export function WarehouseForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = 'Save',
}: {
  initial?: Partial<WarehouseFormValues>;
  onSubmit: (payload: WarehousePayload) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { control, handleSubmit } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      location: initial?.location ?? '',
      isActive: initial?.isActive ?? true,
    },
  });

  return (
    <View className="gap-4">
      <Card className="gap-3">
        <CardTitle>Warehouse</CardTitle>
        <ControlledInput control={control} name="name" label="Name" required placeholder="Main warehouse" />
        <ControlledInput control={control} name="location" label="Location" placeholder="City / address" />
        <ControlledToggle control={control} name="isActive" label="Active" />
      </Card>

      <Button
        label={submitLabel}
        loading={submitting}
        onPress={handleSubmit((v) =>
          onSubmit({
            name: v.name,
            location: v.location?.trim() ? v.location.trim() : undefined,
            isActive: v.isActive,
          }),
        )}
      />
    </View>
  );
}
