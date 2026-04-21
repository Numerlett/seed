'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TrialBalancePage() {
  const { activeBusiness } = useBusiness();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = clientTrpc.accounting.getTrialBalance.useQuery(
    { businessId: activeBusiness?.id ?? '', asOf: new Date(asOf) },
    { enabled: !!activeBusiness?.id },
  );

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Trial Balance" subtitle="Closing balances for all accounts" />
        <div className="flex items-center gap-2">
          <Label className="text-sm">As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : !data?.rows.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No journal entries yet.</TableCell>
                </TableRow>
              ) : (
                data.rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{row.account.code}</TableCell>
                    <TableCell>{row.account.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.account.type}</TableCell>
                    <TableCell className="text-right">{row.debit > 0 ? fmt(row.debit) : '-'}</TableCell>
                    <TableCell className="text-right">{row.credit > 0 ? fmt(row.credit) : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {data && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(data.totals.debit)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(data.totals.credit)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
