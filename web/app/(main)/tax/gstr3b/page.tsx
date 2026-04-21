'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function Gstr3bPreviewPage() {
  const { activeBusiness } = useBusiness();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = clientTrpc.tax.getGstr3bPreview.useQuery(
    { businessId: activeBusiness?.id ?? '', month, year },
    { enabled: !!activeBusiness?.id },
  );

  const fmt = (n?: number | null) => (n != null ? `₹${n.toFixed(2)}` : '₹0.00');

  const rows = data
    ? [
        { label: '3.1 Outward Taxable Supplies', taxable: data.outward?.taxableAmount, igst: data.outward?.igst, cgst: data.outward?.cgst, sgst: data.outward?.sgst },
        { label: '4.A Input Tax Credit (ITC)', taxable: null, igst: data.itc?.igst, cgst: data.itc?.cgst, sgst: data.itc?.sgst },
        { label: 'Net Tax Payable', taxable: null, igst: (data.outward?.igst ?? 0) - (data.itc?.igst ?? 0), cgst: (data.outward?.cgst ?? 0) - (data.itc?.cgst ?? 0), sgst: (data.outward?.sgst ?? 0) - (data.itc?.sgst ?? 0) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="GSTR-3B Preview" subtitle="Summary return — review net tax liability" />
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

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            GSTR-3B Summary — {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : !data ? (
            <p className="text-muted-foreground text-sm">No data for this period.</p>
          ) : (
            <div className="flex flex-col gap-0">
              <div className="grid grid-cols-5 gap-2 pb-2 text-xs font-medium text-muted-foreground">
                <span className="col-span-2">Description</span>
                <span className="text-right">Taxable Amt</span>
                <span className="text-right">IGST</span>
                <span className="text-right">CGST + SGST</span>
              </div>
              <Separator />
              {rows.map((row, i) => (
                <div key={i}>
                  {i === rows.length - 1 && <Separator className="my-2" />}
                  <div
                    className={`grid grid-cols-5 gap-2 py-2 text-sm ${i === rows.length - 1 ? 'font-semibold' : ''}`}
                  >
                    <span className="col-span-2">{row.label}</span>
                    <span className="text-right">{row.taxable != null ? fmt(row.taxable) : '—'}</span>
                    <span className="text-right">{fmt(row.igst)}</span>
                    <span className="text-right">
                      {row.cgst != null && row.sgst != null
                        ? fmt((row.cgst ?? 0) + (row.sgst ?? 0))
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
