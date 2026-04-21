'use client';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  date: z.string().min(1),
  amount: z.number({ coerce: true }).positive(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET', 'OTHER']),
  partyId: z.string().optional(),
  bankAccountId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function MakePaymentPage() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();
  const utils = clientTrpc.useUtils();

  const { data: suppliers } = clientTrpc.party.getPartiesByBusinessId.useQuery(
    { businessId: activeBusiness?.id ?? '', partyType: 'SUPPLIER' },
    { enabled: !!activeBusiness?.id },
  );
  const { data: bankAccounts } = clientTrpc.payments.getBankAccounts.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate, isPending } = clientTrpc.payments.recordPayment.useMutation({
    onSuccess: () => {
      toast.success('Payment recorded');
      utils.payments.getPayments.invalidate();
      router.push('/payments');
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), method: 'CASH' },
  });

  function onSubmit(data: FormData) {
    if (!activeBusiness?.id) return;
    mutate({
      businessId: activeBusiness.id,
      type: 'MADE',
      date: new Date(data.date),
      amount: data.amount,
      method: data.method,
      partyId: data.partyId || undefined,
      bankAccountId: data.bankAccountId || undefined,
      reference: data.reference || undefined,
      notes: data.notes || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Make Payment" subtitle="Record a payment to a supplier" />
      <Card className="max-w-lg">
        <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Date *</Label>
                <Input type="date" {...form.register('date')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...form.register('amount', { valueAsNumber: true })} />
                {form.formState.errors.amount && <p className="text-destructive text-xs">{form.formState.errors.amount.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Payment Method *</Label>
              <Select defaultValue="CASH" onValueChange={(v) => form.setValue('method', v as FormData['method'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET', 'OTHER'].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Supplier</Label>
              <Select onValueChange={(v) => form.setValue('partyId', v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.parties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {bankAccounts && bankAccounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Bank Account</Label>
                <Select onValueChange={(v) => form.setValue('bankAccountId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Reference / Cheque No</Label>
              <Input placeholder="UTR, cheque no..." {...form.register('reference')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" {...form.register('notes')} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
