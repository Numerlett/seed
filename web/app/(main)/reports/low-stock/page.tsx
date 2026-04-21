'use client';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LowStockPage() {
  const { activeBusiness } = useBusiness();

  const { data, isLoading } = clientTrpc.reports.getLowStockReport.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Low Stock Alert" subtitle="Items at or below reorder level" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Current Qty</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-green-600">All items are well-stocked.</TableCell></TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.warehouse}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge variant={row.quantity === 0 ? 'destructive' : 'secondary'}>
                        {row.quantity === 0 ? 'Out of Stock' : 'Low'}
                      </Badge>
                    </TableCell>
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
