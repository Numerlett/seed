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
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  MapPin,
} from 'lucide-react';
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
import { useSearchParams, useRouter } from 'next/navigation';
import type { PartyWithDetails } from '@/types/party';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PartyDetailSheet from './PartyDetailSheet';

type SortOrder = 'asc' | 'desc';
type OrderBy = 'createdAt' | 'name' | 'partyType';

interface PartiesTableProps {
  type: 'customers' | 'suppliers';
}

export default function PartiesTable({ type }: PartiesTableProps) {
  const { currentBusinessMembership } = useBusiness();
  const activeBusiness = currentBusinessMembership?.business;
  const utils = clientTrpc.useUtils();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sync state with search params
  const getParam = (key: string, fallback: string) =>
    searchParams.get(key) || fallback;
  const pageNumber = Number(getParam('page', '1'));
  const pageSize = Number(getParam('pageSize', '50'));
  const search = getParam('search', '');
  const orderBy = getParam('orderBy', 'name') as OrderBy;
  const order = getParam('order', 'asc') as SortOrder;

  // Sheet state
  const [selectedParty, setSelectedParty] = useState<PartyWithDetails | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Delete dialog state
  const [partyToDelete, setPartyToDelete] = useState<PartyWithDetails | null>(
    null,
  );

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Determine party type filter based on route
  const partyTypeFilter =
    type === 'customers'
      ? 'CUSTOMER'
      : type === 'suppliers'
        ? 'SUPPLIER'
        : undefined;

  // Fetch parties
  const { data, isLoading, isError } =
    clientTrpc.party.getPartiesByBusinessId.useQuery(
      {
        businessId: activeBusiness?.id || '',
        pageSize,
        pageNumber,
        order,
        orderBy,
        search: search || undefined,
        partyType: partyTypeFilter as 'CUSTOMER' | 'SUPPLIER' | 'BOTH',
      },
      {
        enabled: !!activeBusiness?.id,
      },
    );

  // Delete mutation
  const deleteMutation = clientTrpc.party.deleteParty.useMutation({
    onSuccess: () => {
      toast.success('Party deleted successfully!');
      utils.party.getPartiesByBusinessId.invalidate();
      setPartyToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete party');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = clientTrpc.party.bulkDeleteParties.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.count} ${data.count === 1 ? 'party' : 'parties'} deleted successfully!`,
      );
      utils.party.getPartiesByBusinessId.invalidate();
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete parties');
    },
  });

  const parties = data?.parties || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Update search params utility
  const updateParams = (
    params: Record<string, string | number | undefined>,
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.replace(`?${newParams.toString()}`);
  };

  const handleSort = (column: OrderBy) => {
    if (orderBy === column) {
      updateParams({
        order: order === 'asc' ? 'desc' : 'asc',
        orderBy: column,
      });
    } else {
      updateParams({ orderBy: column, order: 'asc' });
    }
  };

  const getSortIcon = (column: OrderBy) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const getPartyTypeBadge = (partyType: string) => {
    switch (partyType) {
      case 'CUSTOMER':
        return <Badge variant="default">Customer</Badge>;
      case 'SUPPLIER':
        return <Badge variant="secondary">Supplier</Badge>;
      case 'BOTH':
        return <Badge variant="outline">Both</Badge>;
      default:
        return <Badge>{partyType}</Badge>;
    }
  };

  const handleRowClick = (party: PartyWithDetails) => {
    setSelectedParty(party);
    setIsSheetOpen(true);
  };

  const handleDeleteClick = (party: PartyWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    setPartyToDelete(party);
  };

  const confirmDelete = () => {
    if (partyToDelete && activeBusiness) {
      deleteMutation.mutate({
        id: partyToDelete.id,
        businessId: activeBusiness.id,
      });
    }
  };

  const confirmBulkDelete = () => {
    if (activeBusiness && selectedIds.length > 0) {
      bulkDeleteMutation.mutate({
        ids: selectedIds,
        businessId: activeBusiness.id,
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(parties.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const isAllSelected =
    parties.length > 0 && selectedIds.length === parties.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < parties.length;

  if (!activeBusiness) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-muted flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'party' : 'parties'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              updateParams({ search: e.target.value, page: 1 });
            }}
            className="pl-9"
          />
        </div>

        {/* Reset Filters Button */}
        <Button
          variant="outline"
          onClick={() => {
            router.replace(`/parties/${type}`);
          }}
        >
          Reset Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={isSomeSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="flex items-center"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('partyType')}
                  className="flex items-center"
                >
                  Type
                  {getSortIcon('partyType')}
                </Button>
              </TableHead>
              <TableHead>Addresses</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center"
                >
                  Created
                  {getSortIcon('createdAt')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize > 10 ? 10 : pageSize }).map(
                (_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ),
              )
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-red-500">
                  Error loading parties
                </TableCell>
              </TableRow>
            ) : parties.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground text-center"
                >
                  {search
                    ? 'No parties found matching your search'
                    : `No ${type === 'customers' ? 'customers' : 'suppliers'} found`}
                </TableCell>
              </TableRow>
            ) : (
              parties.map((party) => (
                <TableRow
                  key={party.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(party)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(party.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(party.id, checked as boolean)
                      }
                      aria-label={`Select ${party.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>
                    {party.email || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {party.phone || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getPartyTypeBadge(party.partyType)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">
                        {party._count?.addresses || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(party.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteClick(party, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {parties.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1}{' '}
          to {Math.min(pageNumber * pageSize, totalCount)} of {totalCount}{' '}
          {type === 'customers' ? 'customers' : 'suppliers'}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                updateParams({ pageSize: value, page: 1 });
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateParams({ page: 1 })}
              disabled={pageNumber === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                updateParams({ page: Math.max(1, pageNumber - 1) })
              }
              disabled={pageNumber === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Page {pageNumber} of {totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                updateParams({ page: Math.min(totalPages, pageNumber + 1) })
              }
              disabled={pageNumber >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateParams({ page: totalPages })}
              disabled={pageNumber >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Party Detail Sheet */}
      {selectedParty && (
        <PartyDetailSheet
          partyId={selectedParty.id}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!partyToDelete}
        onOpenChange={(open) => !open && setPartyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the party &quot;{partyToDelete?.name}
              &quot;. This action cannot be undone.
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'party' : 'parties'}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
