'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function JournalEntriesPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.accounting.getJournalEntries.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Journal Entries" subtitle="All posted journal vouchers" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No journal entries yet.</TableCell>
                </TableRow>
              ) : (
                data.items.map((entry) => {
                  const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{entry.narration}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.source}</TableCell>
                      <TableCell className="text-xs">{entry.lines.map((l) => l.account.name).join(', ')}</TableCell>
                      <TableCell className="text-right">{totalDebit.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })
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
