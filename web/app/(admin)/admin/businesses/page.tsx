'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Eye } from 'lucide-react';
import Link from 'next/link';

export default function AdminBusinessesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } =
    clientTrpc.admin.businesses.listBusinesses.useQuery({
      page,
      limit: 20,
      search: search || undefined,
      sortOrder: 'desc',
    });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search businesses by name, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
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
              ) : data?.businesses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No businesses found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.businesses.map((biz) => (
                  <TableRow key={biz.id}>
                    <TableCell className="font-medium">{biz.name}</TableCell>
                    <TableCell>
                      {biz.owner?.name || biz.owner?.email || '—'}
                    </TableCell>
                    <TableCell>{biz._count.members}</TableCell>
                    <TableCell>{biz._count.products}</TableCell>
                    <TableCell>
                      {new Date(biz.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/businesses/${biz.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="size-4" />
                        </Button>
                      </Link>
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
            Showing page {data.page} of {data.totalPages} ({data.total} total)
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
