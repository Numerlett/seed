'use client';

import { useState } from 'react';
import { clientTrpc } from '@seed/api/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MapPin, Mail, Phone, Save, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import { useBusiness } from '@/providers/BusinessProvider';
import PartyForm from './PartyForm';

interface PartyDetailSheetProps {
  partyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'view' | 'edit';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function PartyDetailSheet({
  partyId,
  open,
  onOpenChange,
  initialMode = 'view',
}: PartyDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch party details
  const { data: party, isLoading } = clientTrpc.party.getPartyById.useQuery(
    { id: partyId },
    { enabled: open && !!partyId },
  );

  // Delete mutation
  const deleteMutation = clientTrpc.party.deleteParty.useMutation({
    onSuccess: () => {
      toast.success('Party deleted successfully!');
      utils.party.getPartiesByBusinessId.invalidate();
      onOpenChange(false);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete party');
    },
  });

  const handleDelete = () => {
    if (party && activeBusiness) {
      deleteMutation.mutate({
        id: party.id,
        businessId: activeBusiness.id,
      });
    }
  };

  const handleEditSuccess = () => {
    setMode('view');
    toast.success('Party updated successfully!');
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

  const handleSheetChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMode('view');
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {isLoading ? (
            <>
              <SheetHeader>
                <SheetTitle>Loading...</SheetTitle>
                <Skeleton className="h-4 w-1/2" />
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </>
          ) : !party ? (
            <>
              <SheetHeader>
                <SheetTitle>Party Not Found</SheetTitle>
                <SheetDescription>
                  The requested party could not be found
                </SheetDescription>
              </SheetHeader>
              <div className="flex h-64 items-center justify-center">
                <p className="text-muted-foreground">
                  This party may have been deleted
                </p>
              </div>
            </>
          ) : mode === 'edit' ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">Edit Party</SheetTitle>
                <SheetDescription>
                  Update party information below
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <PartyForm
                  mode="edit"
                  party={party}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setMode('view')}
                />
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">{party.name}</SheetTitle>
                <SheetDescription>Party Details</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {getPartyTypeBadge(party.partyType)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <InfoRow label="Name" value={party.name} />
                    {party.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email:
                        </span>
                        <span className="font-medium">{party.email}</span>
                      </div>
                    )}
                    {party.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone:
                        </span>
                        <span className="font-medium">{party.phone}</span>
                      </div>
                    )}
                    <InfoRow label="Party Type" value={party.partyType} />
                  </div>
                </div>

                <Separator />

                {/* Business Information */}
                {party.business && (
                  <>
                    <div>
                      <h3 className="mb-3 text-lg font-semibold">
                        Business Information
                      </h3>
                      <div className="space-y-2">
                        <InfoRow label="Business" value={party.business.name} />
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Addresses */}
                {party.addresses && party.addresses.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                      <MapPin className="h-5 w-5" />
                      Addresses ({party.addresses.length})
                    </h3>
                    <div className="space-y-4">
                      {party.addresses.map((address, index) => (
                        <div
                          key={address.id}
                          className="space-y-1 rounded-lg border p-4"
                        >
                          <p className="text-sm font-semibold">
                            Address {index + 1}
                          </p>
                          <p className="text-sm">{address.line1}</p>
                          {address.line2 && (
                            <p className="text-sm">{address.line2}</p>
                          )}
                          <p className="text-sm">
                            {address.city}, {address.state} {address.postalCode}
                          </p>
                          <p className="text-sm font-medium">
                            {address.country}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Timestamps */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Additional Information
                  </h3>
                  <div className="space-y-2">
                    <InfoRow
                      label="Created"
                      value={new Date(party.createdAt).toLocaleString()}
                    />
                    <InfoRow
                      label="Last Updated"
                      value={new Date(party.updatedAt).toLocaleString()}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the party &quot;{party?.name}&quot;
              and all associated addresses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
