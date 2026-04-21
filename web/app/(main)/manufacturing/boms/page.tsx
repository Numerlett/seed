'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BomsPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.manufacturing.getBoms.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Bills of Materials" subtitle="Product recipes and component lists" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Yield Qty</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No BOMs yet.</TableCell></TableRow>
              ) : (
                data.items.map((bom) => (
                  <TableRow key={bom.id}>
                    <TableCell className="font-medium">{bom.product?.name}</TableCell>
                    <TableCell>v{bom.version}</TableCell>
                    <TableCell>{Number(bom.yieldQuantity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bom.components.map((c) => c.component?.name).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bom.isActive ? 'default' : 'outline'}>{bom.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
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
