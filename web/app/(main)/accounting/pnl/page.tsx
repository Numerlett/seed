'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const startOfYear = `${new Date().getFullYear()}-04-01`;
const today = new Date().toISOString().slice(0, 10);

export default function ProfitAndLossPage() {
  const { activeBusiness } = useBusiness();
  const [dateFrom, setDateFrom] = useState(startOfYear);
  const [dateTo, setDateTo] = useState(today);

  const { data, isLoading } = clientTrpc.accounting.getProfitAndLoss.useQuery(
    { businessId: activeBusiness?.id ?? '', dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) },
    { enabled: !!activeBusiness?.id },
  );

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Profit & Loss" subtitle="Income statement for a selected period" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !data ? null : (
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {data.incomeLines.map((l) => (
                <div key={l.name} className="flex justify-between text-sm py-0.5">
                  <span className="text-muted-foreground">{l.name}</span>
                  <span>{fmt(l.amount)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Revenue</span>
                <span className="text-green-600">{fmt(data.revenue)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expenseLines.map((l) => (
                <div key={l.name} className="flex justify-between text-sm py-0.5">
                  <span className="text-muted-foreground">{l.name}</span>
                  <span>{fmt(l.amount)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Expenses</span>
                <span className="text-red-600">{fmt(data.expenses)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={data.netProfit >= 0 ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                <span className={data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {fmt(Math.abs(data.netProfit))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
