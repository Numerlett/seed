'use client';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

export default function StockSummaryPage() {
  const { activeBusiness } = useBusiness();

  const { data, isLoading } = clientTrpc.reports.getStockSummary.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Stock Summary" subtitle="Current stock levels across all warehouses" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No stock data.</TableCell></TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.warehouse}</TableCell>
                    <TableCell className="text-right font-medium">{row.quantity}</TableCell>
                    <TableCell className="text-xs">{row.unit}</TableCell>
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
