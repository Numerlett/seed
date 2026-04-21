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

const STATUS_COLORS: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  CANCELLED: 'destructive',
  EXPIRED: 'secondary',
};

export default function EWayBillsPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.tax.getEWayBills.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="E-Way Bills" subtitle="Track goods movement with e-way bill numbers" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>EWB No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Upto</TableHead>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Status</TableHead>
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
                    No e-way bills yet. Generate from invoice detail page.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((ewb) => (
                  <TableRow key={ewb.id}>
                    <TableCell className="font-medium">{ewb.invoice?.documentNumber}</TableCell>
                    <TableCell className="text-xs">{ewb.ewbNo ?? '-'}</TableCell>
                    <TableCell>
                      {ewb.ewbDate ? format(new Date(ewb.ewbDate), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {ewb.validUpto ? format(new Date(ewb.validUpto), 'dd MMM yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{ewb.vehicleNo ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[ewb.status] ?? 'outline'}>{ewb.status}</Badge>
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
