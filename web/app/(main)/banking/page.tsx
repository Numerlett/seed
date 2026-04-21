'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  accountName: z.string().min(1),
  accountNo: z.string().min(1),
  ifsc: z.string().length(11, 'IFSC must be 11 characters'),
  bankName: z.string().min(1),
  branch: z.string().optional(),
  openingBalance: z.number({ coerce: true }).optional(),
});
type FormData = z.infer<typeof schema>;

export default function BankingPage() {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();
  const [showForm, setShowForm] = useState(false);

  const { data: accounts, isLoading } = clientTrpc.payments.getBankAccounts.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate, isPending } = clientTrpc.payments.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success('Bank account added');
      utils.payments.getBankAccounts.invalidate();
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    if (!activeBusiness?.id) return;
    mutate({ businessId: activeBusiness.id, ...data });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Banking" subtitle="Bank accounts and reconciliation" />
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add Account
        </Button>
      </div>

      {showForm && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base">New Bank Account</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><Label>Account Name *</Label><Input {...form.register('accountName')} /></div>
                <div className="flex flex-col gap-1"><Label>Account No *</Label><Input {...form.register('accountNo')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><Label>IFSC *</Label><Input className="uppercase" {...form.register('ifsc')} />{form.formState.errors.ifsc && <p className="text-destructive text-xs">{form.formState.errors.ifsc.message}</p>}</div>
                <div className="flex flex-col gap-1"><Label>Bank Name *</Label><Input {...form.register('bankName')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><Label>Branch</Label><Input {...form.register('branch')} /></div>
                <div className="flex flex-col gap-1"><Label>Opening Balance (₹)</Label><Input type="number" step="0.01" {...form.register('openingBalance', { valueAsNumber: true })} /></div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !accounts?.length ? (
          <p className="text-muted-foreground text-sm">No bank accounts yet.</p>
        ) : (
          accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="pt-4">
                <p className="font-semibold">{acc.accountName}</p>
                <p className="text-xs text-muted-foreground">{acc.bankName} — {acc.accountNo}</p>
                <p className="text-xs text-muted-foreground">IFSC: {acc.ifsc}</p>
                <p className="mt-2 text-lg font-bold">₹{Number(acc.currentBalance).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Current Balance</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
