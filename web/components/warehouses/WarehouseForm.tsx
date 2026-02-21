'use client';

import { clientTrpc } from '@seed/api/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBusiness } from '@/providers/BusinessProvider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { warehouseSchema, warehouseUpdateSchema } from '@seed/schemas';
import type { WarehouseListItem } from '@/types/warehouse';

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface WarehouseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: WarehouseListItem | null;
}

export default function WarehouseForm({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const isEditMode = !!warehouse;

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema) as any,
    defaultValues: {
      name: warehouse?.name || '',
      location: warehouse?.location || '',
      isActive: warehouse?.isActive ?? true,
      businessId: activeBusiness?.id || '',
    },
  });

  // Reset form when warehouse changes
  const prevWarehouseId = form.getValues('name');
  if (isEditMode && warehouse.name !== prevWarehouseId) {
    form.reset({
      name: warehouse.name,
      location: warehouse.location || '',
      isActive: warehouse.isActive,
      businessId: activeBusiness?.id || '',
    });
  }

  const createMutation = clientTrpc.warehouse.createWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse created successfully!');
      utils.warehouse.getWarehouses.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create warehouse');
    },
  });

  const updateMutation = clientTrpc.warehouse.updateWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse updated successfully!');
      utils.warehouse.getWarehouses.invalidate();
      utils.warehouse.getWarehouseById.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update warehouse');
    },
  });

  const onSubmit = (data: WarehouseFormValues) => {
    if (!activeBusiness?.id) {
      toast.error('No active business selected');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate({
        id: warehouse.id,
        businessId: activeBusiness.id,
        data: {
          name: data.name,
          location: data.location,
          isActive: data.isActive,
        },
      });
    } else {
      createMutation.mutate({
        ...data,
        businessId: activeBusiness.id,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Warehouse' : 'Add Warehouse'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Warehouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Building A, Floor 2"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
