'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  DRAFT: 'outline',
  RELEASED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
} as const;

export default function WorkOrdersPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const utils = clientTrpc.useUtils();

  const { data, isLoading } = clientTrpc.manufacturing.getWorkOrders.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate: updateStatus } = clientTrpc.manufacturing.updateWorkOrderStatus.useMutation({
    onSuccess: () => { toast.success('Status updated'); utils.manufacturing.getWorkOrders.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Work Orders" subtitle="Production runs and their status" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO No</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty Planned</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No work orders yet.</TableCell></TableRow>
              ) : (
                data.items.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium">{wo.documentNumber}</TableCell>
                    <TableCell>{wo.bom?.product?.name ?? '-'}</TableCell>
                    <TableCell>{Number(wo.plannedQuantity)}</TableCell>
                    <TableCell>{wo.startDate ? format(new Date(wo.startDate), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS] ?? 'outline'}>{wo.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {wo.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus({ businessId: activeBusiness!.id, workOrderId: wo.id, status: 'RELEASED' })}>
                          Release
                        </Button>
                      )}
                      {wo.status === 'RELEASED' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus({ businessId: activeBusiness!.id, workOrderId: wo.id, status: 'IN_PROGRESS' })}>
                          Start
                        </Button>
                      )}
                      {wo.status === 'IN_PROGRESS' && (
                        <Button size="sm" onClick={() => updateStatus({ businessId: activeBusiness!.id, workOrderId: wo.id, status: 'COMPLETED' })}>
                          Complete
                        </Button>
                      )}
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
