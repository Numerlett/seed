'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;

const STAGE_COLORS = {
  NEW: 'outline',
  CONTACTED: 'secondary',
  QUALIFIED: 'default',
  PROPOSAL: 'default',
  WON: 'default',
  LOST: 'destructive',
} as const;

export default function LeadsPage() {
  const { activeBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<(typeof STAGES)[number] | undefined>();
  const utils = clientTrpc.useUtils();

  const { data, isLoading } = clientTrpc.crm.getLeads.useQuery(
    { businessId: activeBusiness?.id ?? '', page, limit: 20, stage: stageFilter },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate: updateStage } = clientTrpc.crm.updateLeadStage.useMutation({
    onSuccess: () => { toast.success('Stage updated'); utils.crm.getLeads.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Leads" subtitle="Sales pipeline" />
        <Select value={stageFilter ?? 'all'} onValueChange={(v) => setStageFilter(v === 'all' ? undefined : v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Value (₹)</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Move To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.items.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads yet.</TableCell></TableRow>
              ) : (
                data.items.map((lead) => {
                  const currentIdx = STAGES.indexOf(lead.stage as (typeof STAGES)[number]);
                  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phone ?? '-'}</TableCell>
                      <TableCell className="text-xs">{lead.source}</TableCell>
                      <TableCell>{lead.value ? `₹${Number(lead.value).toFixed(0)}` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] ?? 'outline'}>{lead.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        {nextStage && lead.stage !== 'WON' && lead.stage !== 'LOST' && (
                          <Button size="sm" variant="outline" onClick={() => updateStage({ businessId: activeBusiness!.id, leadId: lead.id, stage: nextStage })}>
                            → {nextStage}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
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
