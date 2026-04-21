'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
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

export default function EInvoicesPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const utils = clientTrpc.useUtils();

  const { data, isLoading } = clientTrpc.tax.getEInvoices.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate: generateIrn, isPending: isGenerating } = clientTrpc.tax.generateIrn.useMutation({
    onSuccess: () => {
      toast.success('IRN generation queued');
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <Badge variant={STATUS_COLORS[einv.status] ?? 'outline'}>
                        {einv.status}
                      </Badge>
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
                          disabled={isGenerating}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      ) : einv.status === 'GENERATED' ? (
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <X className="h-3 w-3 mr-1" />
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
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
