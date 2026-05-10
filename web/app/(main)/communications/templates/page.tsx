'use client';
import Link from 'next/link';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data, isLoading } = clientTrpc.communications.getTemplates.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const deleteMutation = clientTrpc.communications.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success('Template deleted');
      utils.communications.getTemplates.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleDelete(id: string, name: string) {
    if (!activeBusiness?.id) return;
    if (!confirm(`Delete template "${name}"?`)) return;
    deleteMutation.mutate({ businessId: activeBusiness.id, id });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Message Templates"
          subtitle="Reusable templates with {{variable}} placeholders"
        />
        <Link href="/communications/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
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
              ) : !data?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No templates yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  const isPlatformTemplate = row.businessId === null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.name}
                        {row.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.variables?.length
                          ? row.variables.join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? 'default' : 'secondary'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPlatformTemplate ? (
                          <span className="text-muted-foreground text-xs">
                            Platform
                          </span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Link href={`/communications/templates/${row.id}`}>
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(row.id, row.name)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
}
