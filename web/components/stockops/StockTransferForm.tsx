'use client';

import { clientTrpc } from '@seed/api/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusiness } from '@/providers/BusinessProvider';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { stockTransferSchema } from '@seed/schemas';
import { ProductSelector } from '@/components/shared/ProductSelector';
import { WarehouseSelector } from '@/components/shared/WarehouseSelector';

type StockTransferFormValues = z.infer<typeof stockTransferSchema>;

export default function StockTransferForm() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();
  const utils = clientTrpc.useUtils();

  const form = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      documentNumber: '',
      transferDate: new Date(),
      notes: '',
      sourceWarehouseId: '',
      destWarehouseId: '',
      businessId: activeBusiness?.id || '',
      items: [
        {
          productId: '',
          quantity: 1,
          unitCost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const createMutation = clientTrpc.stockops.createStockTransfer.useMutation({
    onSuccess: () => {
      toast.success('Stock transfer created!');
      utils.stockops.getStockTransfers.invalidate();
      router.push('/stock-ops/transfers');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create stock transfer');
    },
  });

  const onSubmit = (data: StockTransferFormValues) => {
    if (!activeBusiness?.id) {
      toast.error('No active business selected');
      return;
    }
    if (data.sourceWarehouseId === data.destWarehouseId) {
      toast.error('Source and destination warehouses must be different');
      return;
    }
    createMutation.mutate({
      ...data,
      businessId: activeBusiness.id,
    });
  };

  if (!activeBusiness) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated if empty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceWarehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Warehouse</FormLabel>
                  <FormControl>
                    <WarehouseSelector
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destWarehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Warehouse</FormLabel>
                  <FormControl>
                    <WarehouseSelector
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transfer Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: '',
                  quantity: 1,
                  unitCost: 0,
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-4"
              >
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <FormControl>
                          <ProductSelector
                            value={f.value}
                            onValueChange={(id) => f.onChange(id)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...f}
                          onChange={(e) =>
                            f.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitCost`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...f}
                            onChange={(e) =>
                              f.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mb-0.5"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {form.formState.errors.items?.root && (
              <p className="text-sm text-red-500">
                {form.formState.errors.items.root.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/stock-ops/transfers')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Transfer
          </Button>
        </div>
      </form>
    </Form>
  );
}
