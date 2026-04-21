'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

const TYPE_COLORS = {
  ASSET: 'default',
  LIABILITY: 'secondary',
  EQUITY: 'outline',
  INCOME: 'default',
  EXPENSE: 'destructive',
} as const;

export default function ChartOfAccountsPage() {
  const { activeBusiness } = useBusiness();

  const { data: accounts, isLoading } = clientTrpc.accounting.getChartOfAccounts.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const grouped = accounts?.reduce<Record<string, typeof accounts>>((acc, a) => {
    acc[a.type] = acc[a.type] ?? [];
    acc[a.type].push(a);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Chart of Accounts" subtitle="All accounts in the double-entry ledger" />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        Object.entries(grouped ?? {}).map(([type, accts]) => (
          <Card key={type}>
            <CardContent className="p-0">
              <div className="px-4 py-3 font-semibold text-sm border-b">{type}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sub-Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE_COLORS[a.type as keyof typeof TYPE_COLORS] ?? 'outline'} className="text-xs">
                          {a.subType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
