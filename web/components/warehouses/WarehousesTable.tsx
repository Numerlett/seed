'use client';

import { useState } from 'react';
import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Trash2, Pencil, MapPin, Layers } from 'lucide-react';
import { toast } from 'sonner';
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
import type { WarehouseListItem } from '@/types/warehouse';
import WarehouseDetailSheet from './WarehouseDetailSheet';
import WarehouseForm from './WarehouseForm';

export default function WarehousesTable() {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] =
    useState<WarehouseListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<WarehouseListItem | null>(
    null,
  );

  const {
    data: warehouses,
    isLoading,
    isError,
  } = clientTrpc.warehouse.getWarehouses.useQuery(
    {
      businessId: activeBusiness?.id || '',
      search: search || undefined,
    },
    { enabled: !!activeBusiness?.id },
  );

  const deleteMutation = clientTrpc.warehouse.deleteWarehouse.useMutation({
    onSuccess: () => {
      toast.success('Warehouse deleted successfully!');
      utils.warehouse.getWarehouses.invalidate();
      setWarehouseToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete warehouse');
    },
  });

  const handleRowClick = (warehouse: WarehouseListItem) => {
    setSelectedWarehouse(warehouse);
    setIsSheetOpen(true);
  };

  const handleEdit = (warehouse: WarehouseListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditWarehouse(warehouse);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (
    warehouse: WarehouseListItem,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setWarehouseToDelete(warehouse);
  };

  const confirmDelete = () => {
    if (warehouseToDelete && activeBusiness) {
      deleteMutation.mutate({
        id: warehouseToDelete.id,
        businessId: activeBusiness.id,
      });
    }
  };

  if (!activeBusiness) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditWarehouse(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Shelves</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-500">
                  Error loading warehouses
                </TableCell>
              </TableRow>
            ) : !warehouses || warehouses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground text-center"
                >
                  No warehouses found
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((warehouse) => (
                <TableRow
                  key={warehouse.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(warehouse)}
                >
                  <TableCell className="font-medium">
                    {warehouse.name}
                  </TableCell>
                  <TableCell>
                    {warehouse.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="text-muted-foreground h-3 w-3" />
                        {warehouse.location}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Layers className="text-muted-foreground h-3 w-3" />
                      {warehouse._count.shelves}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={warehouse.isActive ? 'default' : 'secondary'}
                    >
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleEdit(warehouse, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteClick(warehouse, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <WarehouseDetailSheet
        warehouseId={selectedWarehouse?.id || null}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      {/* Create/Edit Dialog */}
      <WarehouseForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditWarehouse(null);
        }}
        warehouse={editWarehouse}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!warehouseToDelete}
        onOpenChange={(open) => !open && setWarehouseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the warehouse &quot;
              {warehouseToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
