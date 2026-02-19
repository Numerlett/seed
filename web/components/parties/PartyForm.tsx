'use client';

import { clientTrpc } from '@seed/api/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusiness } from '@/providers/BusinessProvider';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { partyFormSchema, type PartyFormData } from '@/lib/schemas/party';
import AddressFields from './AddressFields';
import type { PartyWithBusiness } from '@/types/party';

interface PartyFormProps {
  mode: 'create' | 'edit' | 'view';
  party?: PartyWithBusiness;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PartyForm({
  mode,
  party,
  onSuccess,
  onCancel,
}: PartyFormProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const form = useForm<PartyFormData>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: party?.name || '',
      email: party?.email || '',
      phone: party?.phone || '',
      partyType: party?.partyType || 'CUSTOMER',
      addresses:
        party?.addresses?.map((addr) => ({
          line1: addr.line1,
          line2: addr.line2 || '',
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
        })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'addresses',
  });

  const createMutation = clientTrpc.party.createParty.useMutation({
    onSuccess: () => {
      toast.success('Party created successfully!');
      utils.party.getPartiesByBusinessId.invalidate();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create party');
    },
  });

  const updateMutation = clientTrpc.party.updateParty.useMutation({
    onSuccess: () => {
      toast.success('Party updated successfully!');
      utils.party.getPartiesByBusinessId.invalidate();
      utils.party.getPartyById.invalidate();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update party');
    },
  });

  const onSubmit = async (data: PartyFormData) => {
    if (!activeBusiness?.id) {
      toast.error('No active business selected');
      return;
    }

    const transformedData = {
      ...data,
      businessId: activeBusiness.id,
      email: data.email || null,
      phone: data.phone || null,
      addresses: data.addresses?.length ? data.addresses : undefined,
    };

    if (isCreateMode) {
      createMutation.mutate(transformedData);
    } else if (isEditMode && party) {
      updateMutation.mutate({
        id: party.id,
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          partyType: data.partyType,
        },
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!activeBusiness && isCreateMode) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Party name"
                      {...field}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1234567890"
                      {...field}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isViewMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Addresses Section */}
        {isCreateMode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Addresses</span>
                {!isViewMode && fields.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        line1: '',
                        line2: '',
                        city: '',
                        state: '',
                        postalCode: '',
                        country: '',
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Address
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No addresses added. Click &quot;Add Address&quot; to add one.
                </p>
              ) : (
                fields.map((field, index) => (
                  <AddressFields
                    key={field.id}
                    form={form}
                    index={index}
                    onRemove={index > 0 ? () => remove(index) : undefined}
                    disabled={isViewMode}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!isViewMode && (
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isCreateMode ? 'Create Party' : 'Update Party'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
