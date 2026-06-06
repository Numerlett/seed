import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import * as z from 'zod';

import { Button, Card, CardTitle } from './ui';
import { ControlledInput } from './form/ControlledInput';
import { ControlledSelect } from './form/ControlledSelect';

export const partyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
});

export type PartyFormValues = z.infer<typeof partyFormSchema>;

export interface PartyPayload {
  name: string;
  email?: string;
  phone?: string;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
}

const partyTypeOptions = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Supplier', value: 'SUPPLIER' },
  { label: 'Both', value: 'BOTH' },
];

export function PartyForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = 'Save',
}: {
  initial?: Partial<PartyFormValues>;
  onSubmit: (payload: PartyPayload) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { control, handleSubmit } = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      partyType: initial?.partyType ?? 'CUSTOMER',
    },
  });

  return (
    <View className="gap-4">
      <Card className="gap-3">
        <CardTitle>Contact</CardTitle>
        <ControlledInput control={control} name="name" label="Name" required placeholder="Party name" />
        <ControlledSelect
          control={control}
          name="partyType"
          label="Type"
          options={partyTypeOptions}
          title="Party type"
        />
        <ControlledInput control={control} name="email" label="Email" placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
        <ControlledInput control={control} name="phone" label="Phone" placeholder="Phone number" keyboardType="phone-pad" />
      </Card>

      <Button
        label={submitLabel}
        loading={submitting}
        onPress={handleSubmit((v) =>
          onSubmit({
            name: v.name,
            email: v.email?.trim() ? v.email.trim() : undefined,
            phone: v.phone?.trim() ? v.phone.trim() : undefined,
            partyType: v.partyType,
          }),
        )}
      />
    </View>
  );
}
