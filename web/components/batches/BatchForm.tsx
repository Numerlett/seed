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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useBusiness } from '@/providers/BusinessProvider';
import { toast } from 'sonner';
import { Loader2, CalendarIcon } from 'lucide-react';
import { productBatchSchema, productBatchUpdateSchema } from '@seed/schemas';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type CreateValues = z.infer<typeof productBatchSchema>;
type UpdateValues = z.infer<typeof productBatchUpdateSchema>;

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When editing, pass the existing batch */
  batch?: any;
  /** Required when creating a new batch — the product to attach to */
  productId?: string;
}

export default function BatchForm({
  open,
  onOpenChange,
  batch,
  productId,
}: BatchFormProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const isEditMode = !!batch;

  const form = useForm<CreateValues>({
    resolver: zodResolver(productBatchSchema),
    defaultValues: {
      batchNumber: batch?.batchNumber || '',
      expiryDate: batch?.expiryDate ? new Date(batch.expiryDate) : undefined,
      manufacturingDate: batch?.manufacturingDate
        ? new Date(batch.manufacturingDate)
        : undefined,
      purchasePrice: batch?.purchasePrice ?? 0,
      productId: batch?.productId || productId || '',
      businessId: activeBusiness?.id || '',
    },
  });

  // Reset when batch / dialog changes
  const currentBatchNumber = form.getValues('batchNumber');
  if (isEditMode && batch.batchNumber !== currentBatchNumber) {
    form.reset({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
      manufacturingDate: batch.manufacturingDate
        ? new Date(batch.manufacturingDate)
        : undefined,
      purchasePrice: batch.purchasePrice ?? 0,
      productId: batch.productId,
      businessId: activeBusiness?.id || '',
    });
  }

  const createMutation = clientTrpc.batch.createBatch.useMutation({
    onSuccess: () => {
      toast.success('Batch created successfully!');
      utils.batch.getBatchesByProduct.invalidate();
      utils.batch.getExpiringBatches.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create batch');
    },
  });

  const updateMutation = clientTrpc.batch.updateBatch.useMutation({
    onSuccess: () => {
      toast.success('Batch updated successfully!');
      utils.batch.getBatchById.invalidate();
      utils.batch.getBatchesByProduct.invalidate();
      utils.batch.getExpiringBatches.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update batch');
    },
  });

  const onSubmit = (data: CreateValues) => {
    if (!activeBusiness?.id) {
      toast.error('No active business selected');
      return;
    }

    if (isEditMode) {
      const updateData: UpdateValues = {
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ?? null,
        manufacturingDate: data.manufacturingDate ?? null,
        purchasePrice: data.purchasePrice,
      };
      updateMutation.mutate({
        id: batch.id,
        businessId: activeBusiness.id,
        data: updateData,
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
            {isEditMode ? 'Edit Batch' : 'Create Batch'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BATCH-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manufacturingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Manufacturing Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value
                            ? format(field.value, 'dd/MM/yyyy')
                            : 'Select date'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value
                            ? format(field.value, 'dd/MM/yyyy')
                            : 'Select date'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
