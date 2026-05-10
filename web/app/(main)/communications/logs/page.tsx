'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP';
type Status = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';

const statusVariant: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  SENT: 'outline',
  DELIVERED: 'default',
  FAILED: 'destructive',
};

export default function LogsPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<Channel | 'ALL'>('ALL');
  const [status, setStatus] = useState<Status | 'ALL'>('ALL');

  const { data, isLoading } = clientTrpc.communications.getLogs.useQuery(
    {
      businessId: activeBusiness?.id ?? '',
      page,
      limit: 50,
      ...(channel !== 'ALL' && { channel }),
      ...(status !== 'ALL' && { status }),
    },
    { enabled: !!activeBusiness?.id },
  );

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="Message Log"
        subtitle="Every email, SMS, and WhatsApp message sent"
      />

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Channel</span>
          <Select
            value={channel}
            onValueChange={(v) => {
              setChannel(v as Channel | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Status</span>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as Status | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent At</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject / Preview</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No messages logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.channel}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.to}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {row.subject ? (
                        <span className="font-medium">{row.subject}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.body.slice(0, 80)}
                          {row.body.length > 80 ? '…' : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.template?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status as Status]}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
