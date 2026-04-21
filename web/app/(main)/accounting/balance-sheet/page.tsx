'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const fmt = (n: number) => `₹${n.toFixed(2)}`;
const netBal = (r: { debit: number; credit: number }) => r.debit - r.credit;

function Section({ title, rows, total }: { title: string; rows: Array<{ account: { code: string; name: string }; debit: number; credit: number }>; total: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">{r.account.code} — {r.account.name}</span>
            <span>{fmt(Math.abs(netBal(r)))}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <div className="flex justify-between font-semibold">
          <span>Total {title}</span>
          <span>{fmt(Math.abs(total))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BalanceSheetPage() {
  const { activeBusiness } = useBusiness();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = clientTrpc.accounting.getBalanceSheet.useQuery(
    { businessId: activeBusiness?.id ?? '', asOf: new Date(asOf) },
    { enabled: !!activeBusiness?.id },
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Balance Sheet" subtitle="Assets, liabilities, and equity snapshot" />
        <div className="flex items-center gap-1.5">
          <Label className="text-xs">As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !data ? null : (
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          <Section title="Assets" rows={data.assets} total={data.totalAssets} />
          <Section title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
          <Section title="Equity" rows={data.equity} total={data.totalEquity} />
          <Card className={Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity) < 0.01 ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              {Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity) < 0.01
                ? 'Balance sheet is balanced.'
                : 'Warning: Balance sheet does not balance.'}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
