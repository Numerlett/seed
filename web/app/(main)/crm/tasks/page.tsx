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

const PRIORITY_COLORS = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
} as const;

export default function TasksPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);

  const { data, isLoading } = clientTrpc.crm.getTasks.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20 },
    { enabled: !!activeBusiness?.id },
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Tasks" subtitle="Follow-ups and actions" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No tasks yet.</TableCell></TableRow>
              ) : (
                data.items.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.dueAt ? format(new Date(task.dueAt), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? 'outline'}>{task.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'COMPLETED' ? 'default' : task.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                        {task.status}
                      </Badge>
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
