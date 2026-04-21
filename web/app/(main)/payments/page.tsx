'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function PaymentsPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.payments.getPayments.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Payments" subtitle="Money in and money out" />
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/payments/receive"><Plus className="h-3.5 w-3.5 mr-1" />Receive Payment</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/payments/make"><Plus className="h-3.5 w-3.5 mr-1" />Make Payment</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doc No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments recorded yet.</TableCell></TableRow>
              ) : (
                data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.documentNumber}</TableCell>
                    <TableCell>{format(new Date(p.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={p.type === 'RECEIVED' ? 'default' : 'secondary'}>{p.type}</Badge>
                    </TableCell>
                    <TableCell>{p.party?.name ?? '-'}</TableCell>
                    <TableCell className="text-xs">{p.method}</TableCell>
                    <TableCell className="text-right font-medium">{Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'CLEARED' ? 'default' : p.status === 'BOUNCED' ? 'destructive' : 'outline'}>
                        {p.status}
                      </Badge>
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
