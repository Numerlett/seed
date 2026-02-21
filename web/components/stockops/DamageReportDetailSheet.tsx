'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared';
import { toast } from 'sonner';
import type { DamageReportListItem } from '@/types/stockops';

const damageTypeColors: Record<string, string> = {
  DAMAGED:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  LOST: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface DamageReportDetailSheetProps {
  report: DamageReportListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DamageReportDetailSheet({
  report,
  open,
  onOpenChange,
}: DamageReportDetailSheetProps) {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: detail, isLoading } =
    clientTrpc.stockops.getDamageReportById.useQuery(
      { id: report?.id || '', businessId: activeBusiness?.id || '' },
      { enabled: !!report?.id && !!activeBusiness?.id && open },
    );

  const confirmMutation = clientTrpc.stockops.confirmDamageReport.useMutation({
    onSuccess: () => {
      toast.success('Damage report confirmed — stock updated');
      utils.stockops.getDamageReports.invalidate();
      utils.stockops.getDamageReportById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = clientTrpc.stockops.cancelDamageReport.useMutation({
    onSuccess: () => {
      toast.success('Damage report cancelled');
      utils.stockops.getDamageReports.invalidate();
      utils.stockops.getDamageReportById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!report || !activeBusiness) return;
    confirmMutation.mutate({ id: report.id, businessId: activeBusiness.id });
  };

  const handleCancel = () => {
    if (!report || !activeBusiness) return;
    cancelMutation.mutate({ id: report.id, businessId: activeBusiness.id });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Damage Report {report?.documentNumber || ''}</SheetTitle>
          <SheetDescription>Damage report details</SheetDescription>
        </SheetHeader>

        {isLoading || !detail ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{detail.warehouse?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(detail.reportDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">{detail.reason}</p>
                </div>
                {detail.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{detail.notes}</p>
                  </div>
                )}
              </div>

              {detail.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm">Confirm Report</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm Damage Report?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will deduct damaged/expired/lost stock from the
                          warehouse. Expired batches will be marked accordingly.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel Report
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Report?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the damage report as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>
                          Cancel Report
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold">Damaged Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.product?.name || '—'}
                            </p>
                            {item.batch && (
                              <p className="text-muted-foreground text-xs">
                                Batch: {item.batch.batchNumber}
                              </p>
                            )}
                            {item.shelf && (
                              <p className="text-muted-foreground text-xs">
                                Shelf: {item.shelf.shelfCode}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={damageTypeColors[item.damageType] || ''}
                            variant="secondary"
                          >
                            {item.damageType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalLoss)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 text-right text-sm">
                <div className="flex justify-end gap-8 text-base font-bold">
                  <span>Total Loss</span>
                  <span>
                    {formatCurrency(
                      detail.items?.reduce(
                        (sum: number, item: any) =>
                          sum + Number(item.totalLoss || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
