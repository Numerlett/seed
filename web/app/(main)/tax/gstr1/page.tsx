'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function Gstr1PreviewPage() {
  const { activeBusiness } = useBusiness();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = clientTrpc.tax.getGstr1Preview.useQuery(
    { businessId: activeBusiness?.id ?? '', month, year },
    { enabled: !!activeBusiness?.id },
  );

  const fmt = (n?: number | null) => (n != null ? `₹${n.toFixed(2)}` : '₹0.00');

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="GSTR-1 Preview" subtitle="Outward supply return — review before filing" />
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Taxable Value', value: fmt(data.summary.taxableAmount) },
            { label: 'CGST', value: fmt(data.summary.cgst) },
            { label: 'SGST', value: fmt(data.summary.sgst) },
            { label: 'IGST', value: fmt(data.summary.igst) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">B2B Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GSTIN (Buyer)</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Taxable Amt</TableHead>
                <TableHead>IGST</TableHead>
                <TableHead>CGST</TableHead>
                <TableHead>SGST</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data?.b2b?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No B2B invoices for this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.b2b.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-xs">{inv.buyerGstin ?? '-'}</TableCell>
                    <TableCell className="font-medium">{inv.documentNumber}</TableCell>
                    <TableCell>
                      {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{fmt(inv.taxableAmount)}</TableCell>
                    <TableCell>{fmt(inv.igstAmount)}</TableCell>
                    <TableCell>{fmt(inv.cgstAmount)}</TableCell>
                    <TableCell>{fmt(inv.sgstAmount)}</TableCell>
                    <TableCell className="font-medium">{fmt(inv.grandTotal)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
