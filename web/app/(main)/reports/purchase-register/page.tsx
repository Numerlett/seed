'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);

export default function PurchaseRegisterPage() {
  const { activeBusiness } = useBusiness();
  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.reports.getPurchaseRegister.useQuery(
    { businessId: activeBusiness?.id ?? '', dateFrom: new Date(dateFrom), dateTo: new Date(dateTo), page, limit: 50 },
    { enabled: !!activeBusiness?.id },
  );

  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const totalPages = data ? Math.ceil(data.total / 50) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Purchase Register" subtitle="All confirmed purchase orders" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 h-8 text-sm" />
          </div>
        </div>
      </div>

      {data?.summary && (
        <div className="flex gap-6 text-sm">
          {[['Taxable', fmt(data.summary.taxableAmount)], ['Grand Total', fmt(data.summary.grandTotal)]].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-muted-foreground text-xs">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchases in this period.</TableCell></TableRow>
              ) : (
                data.items.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.documentNumber}</TableCell>
                    <TableCell>{format(new Date(po.orderDate!), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{po.supplierName ?? '-'}</TableCell>
                    <TableCell className="text-xs">{po.supplierGstin ?? '-'}</TableCell>
                    <TableCell className="text-right">{po.taxableAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{po.grandTotal.toFixed(2)}</TableCell>
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
