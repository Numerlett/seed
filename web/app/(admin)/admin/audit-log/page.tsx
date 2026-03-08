'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

const ACTION_OPTIONS = [
  'UPDATE_SETTING',
  'DEACTIVATE_ADMIN',
  'ACTIVATE_ADMIN',
  'PROMOTE_SUPER_ADMIN',
  'DEMOTE_SUPER_ADMIN',
  'DELETE_USER',
  'DELETE_BUSINESS',
];

const ENTITY_OPTIONS = [
  'system_setting',
  'admin',
  'user',
  'business',
];

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [entity, setEntity] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = clientTrpc.admin.auditLog.getAuditLogs.useQuery({
    page,
    limit: 25,
    action: action || undefined,
    entity: entity || undefined,
  });

  const clearFilters = () => {
    setAction(undefined);
    setEntity(undefined);
    setPage(1);
  };

  const hasFilters = !!action || !!entity;

  return (
    <div className="space-y-4 p-6">
      {/* Filters Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 size-4" />
          Filters
          {hasFilters && (
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 size-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-wrap gap-4 p-4">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs font-medium">
                Action
              </label>
              <Select
                value={action ?? 'all'}
                onValueChange={(v) => {
                  setAction(v === 'all' ? undefined : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs font-medium">
                Entity
              </label>
              <Select
                value={entity ?? 'all'}
                onValueChange={(v) => {
                  setEntity(v === 'all' ? undefined : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.admin?.user?.name || log.admin?.user?.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entity}
                    </TableCell>
                    <TableCell className="max-w-24 truncate font-mono text-xs">
                      {log.entityId || '—'}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs">
                      {log.details
                        ? typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : String(log.details)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
