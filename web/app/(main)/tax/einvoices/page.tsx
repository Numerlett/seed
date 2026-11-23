'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  IntegrationGate,
  useIntegrationConfigured,
} from '@/components/main/IntegrationGate';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RefreshCw, X } from 'lucide-react';

const STATUS_COLORS: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  GENERATED: 'default',
  CANCELLATION_PENDING: 'secondary',
  CANCELLED: 'destructive',
  FAILED: 'destructive',
};

// The reason codes the IRP accepts for a cancellation.
const CANCEL_REASONS = [
  { value: '1', label: 'Duplicate' },
  { value: '2', label: 'Data entry mistake' },
  { value: '3', label: 'Order cancelled' },
  { value: '4', label: 'Other' },
] as const;

export default function EInvoicesPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('2');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const utils = clientTrpc.useUtils();

  const einvoiceConfigured = useIntegrationConfigured('einvoice');

  const { data, isLoading } = clientTrpc.tax.getEInvoices.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate: generateIrn, isPending: isGenerating } = clientTrpc.tax.generateIrn.useMutation({
    onSuccess: (result) => {
      // The call is synchronous now: an IRN in the response means the portal
      // registered it, so say that rather than "queued".
      toast.success(
        result?.irn ? `IRN registered: ${result.irn}` : 'IRN generation submitted',
      );
      utils.tax.getEInvoices.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: cancelIrn, isPending: isCancelling } = clientTrpc.tax.cancelIrn.useMutation({
    onSuccess: () => {
      toast.success('IRN cancelled');
      setCancelTarget(null);
      setCancelRemarks('');
      utils.tax.getEInvoices.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="E-Invoices" subtitle="Invoice Reference Numbers (IRN) from IRP" />
      </div>

      <IntegrationGate id="einvoice">
        This server has no GST Suvidha Provider credentials, so invoices cannot be
        registered with the IRP. Existing records are shown below; generating and
        cancelling are disabled until an administrator configures the GSP.
      </IntegrationGate>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>IRN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No e-invoices yet. Confirm a sale invoice and generate IRN from the invoice detail page.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((einv) => (
                  <TableRow key={einv.id}>
                    <TableCell className="font-medium">{einv.invoice?.documentNumber}</TableCell>
                    <TableCell>
                      {einv.invoice?.invoiceDate
                        ? format(new Date(einv.invoice.invoiceDate), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      ₹{einv.invoice?.grandTotal?.toFixed(2) ?? '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {einv.irn ?? '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_COLORS[einv.status] ?? 'outline'}>
                          {einv.status}
                        </Badge>
                        {/* A failed filing is only actionable when the portal
                            reason is visible. */}
                        {einv.failureReason && (
                          <span className="text-destructive max-w-[240px] text-xs">
                            {einv.failureReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {einv.status === 'PENDING' || einv.status === 'FAILED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            generateIrn({
                              businessId: activeBusiness!.id,
                              invoiceId: einv.invoiceId,
                            })
                          }
                          disabled={isGenerating || einvoiceConfigured === false}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Retry
                        </Button>
                      ) : einv.status === 'GENERATED' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setCancelTarget(einv.invoiceId)}
                          disabled={einvoiceConfigured === false}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel IRN
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel IRN</DialogTitle>
            <DialogDescription>
              The IRP only accepts a cancellation within 24 hours of registration.
              After that the invoice has to be reversed with a credit note.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-reason">Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger id="cancel-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-remarks">Remarks</Label>
              <Textarea
                id="cancel-remarks"
                value={cancelRemarks}
                onChange={(event) => setCancelRemarks(event.target.value)}
                placeholder="Why is this invoice being cancelled?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={isCancelling || cancelRemarks.trim().length === 0}
              onClick={() =>
                cancelTarget &&
                cancelIrn({
                  businessId: activeBusiness!.id,
                  invoiceId: cancelTarget,
                  reason: cancelReason as '1' | '2' | '3' | '4' | '5',
                  remarks: cancelRemarks.trim(),
                })
              }
            >
              Cancel IRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
