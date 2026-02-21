'use client';

import { useState } from 'react';
import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { shelfSchema } from '@seed/schemas';

type ShelfFormValues = z.infer<typeof shelfSchema>;

interface Shelf {
  id: string;
  shelfCode: string;
  description: string | null;
  isActive: boolean;
}

interface ShelfManagerProps {
  warehouseId: string;
  shelves: Shelf[];
}

export default function ShelfManager({
  warehouseId,
  shelves,
}: ShelfManagerProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const [showAddForm, setShowAddForm] = useState(false);
  const [shelfToDelete, setShelfToDelete] = useState<Shelf | null>(null);

  const form = useForm<ShelfFormValues>({
    resolver: zodResolver(shelfSchema) as any,
    defaultValues: {
      shelfCode: '',
      description: '',
      isActive: true,
      warehouseId,
      businessId: activeBusiness?.id || '',
    },
  });

  const createMutation = clientTrpc.warehouse.createShelf.useMutation({
    onSuccess: () => {
      toast.success('Shelf created!');
      utils.warehouse.getWarehouseById.invalidate();
      form.reset({
        shelfCode: '',
        description: '',
        isActive: true,
        warehouseId,
        businessId: activeBusiness?.id || '',
      });
      setShowAddForm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create shelf');
    },
  });

  const deleteMutation = clientTrpc.warehouse.deleteShelf.useMutation({
    onSuccess: () => {
      toast.success('Shelf deleted!');
      utils.warehouse.getWarehouseById.invalidate();
      setShelfToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete shelf');
    },
  });

  const onSubmit = (data: ShelfFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shelves</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Shelf
        </Button>
      </div>

      {/* Add Shelf Form */}
      {showAddForm && (
        <div className="rounded-lg border p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="shelfCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf Code</FormLabel>
                    <FormControl>
                      <Input placeholder="A-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional description"
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
                  <FormItem className="flex items-center justify-between rounded-lg border p-2">
                    <FormLabel className="text-sm">Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  Create
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Shelves Table */}
      {shelves.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No shelves yet. Add one above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shelves.map((shelf) => (
              <TableRow key={shelf.id}>
                <TableCell className="font-medium">{shelf.shelfCode}</TableCell>
                <TableCell>
                  {shelf.description || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={shelf.isActive ? 'default' : 'secondary'}>
                    {shelf.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShelfToDelete(shelf)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!shelfToDelete}
        onOpenChange={(open) => !open && setShelfToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shelf?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete shelf &quot;
              {shelfToDelete?.shelfCode}
              &quot;. Shelves with stock cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (shelfToDelete && activeBusiness) {
                  deleteMutation.mutate({
                    id: shelfToDelete.id,
                    businessId: activeBusiness.id,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
