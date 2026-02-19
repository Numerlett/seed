'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PartyForm from './PartyForm';

interface AddPartyDialogProps {
  type?: 'customers' | 'suppliers';
}

export default function AddPartyDialog({ type }: AddPartyDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  const partyTypeLabel =
    type === 'customers'
      ? 'Customer'
      : type === 'suppliers'
        ? 'Supplier'
        : 'Party';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add {partyTypeLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New {partyTypeLabel}</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new{' '}
            {partyTypeLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <PartyForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
