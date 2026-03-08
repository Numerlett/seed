'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Users, Building2, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type SortBy = 'members' | 'products';

export default function AdminAnalyticsPage() {
  const [userRange, setUserRange] = useState<TimeRange>('30d');
  const [bizRange, setBizRange] = useState<TimeRange>('30d');
  const [topSortBy, setTopSortBy] = useState<SortBy>('members');

  const { data: userGrowth, isLoading: userGrowthLoading } =
    clientTrpc.admin.analytics.getUserGrowth.useQuery({ range: userRange });

  const { data: bizGrowth, isLoading: bizGrowthLoading } =
    clientTrpc.admin.analytics.getBusinessGrowth.useQuery({ range: bizRange });

  const { data: topBusinesses, isLoading: topBizLoading } =
    clientTrpc.admin.analytics.getTopBusinesses.useQuery({
      limit: 10,
      sortBy: topSortBy,
    });

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Analytics</h2>

      <Tabs defaultValue="growth">
        <TabsList>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="top">Top Businesses</TabsTrigger>
        </TabsList>

        {/* Growth Tab */}
        <TabsContent value="growth" className="mt-4 space-y-6">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  User Growth
                </CardTitle>
                <Select
                  value={userRange}
                  onValueChange={(v) => setUserRange(v as TimeRange)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {userGrowthLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : userGrowth && userGrowth.length > 0 ? (
                <GrowthChart data={userGrowth} color="bg-primary" />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No data for selected range.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Business Growth */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  Business Growth
                </CardTitle>
                <Select
                  value={bizRange}
                  onValueChange={(v) => setBizRange(v as TimeRange)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {bizGrowthLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : bizGrowth && bizGrowth.length > 0 ? (
                <GrowthChart data={bizGrowth} color="bg-blue-500" />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No data for selected range.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Businesses Tab */}
        <TabsContent value="top" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  Top Businesses
                </CardTitle>
                <Select
                  value={topSortBy}
                  onValueChange={(v) => setTopSortBy(v as SortBy)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="members">By Members</SelectItem>
                    <SelectItem value="products">By Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topBizLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : topBusinesses?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No businesses yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topBusinesses?.map((biz, idx) => (
                      <TableRow key={biz.id}>
                        <TableCell className="text-muted-foreground font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{biz.name}</TableCell>
                        <TableCell>
                          {biz.owner?.name || biz.owner?.email || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {biz._count.members}
                        </TableCell>
                        <TableCell className="text-right">
                          {biz._count.products}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Simple bar chart rendered with CSS — no chart library needed.
 */
function GrowthChart({
  data,
  color,
}: {
  data: { date: string; count: number }[];
  color: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  // For large datasets, aggregate into buckets
  const bucketSize =
    data.length > 90 ? 7 : data.length > 30 ? 3 : 1;
  const buckets: { label: string; count: number }[] = [];
  for (let i = 0; i < data.length; i += bucketSize) {
    const slice = data.slice(i, i + bucketSize);
    const count = slice.reduce((s, d) => s + d.count, 0);
    const label =
      bucketSize === 1
        ? formatDate(slice[0].date)
        : `${formatDate(slice[0].date)} – ${formatDate(slice[slice.length - 1].date)}`;
    buckets.push({ label, count });
  }

  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-sm">
        Total: <span className="text-foreground font-semibold">{total}</span> new
        registrations
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 160 }}>
        {buckets.map((bucket, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
            style={{ height: '100%' }}
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-black px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
              {bucket.label}: {bucket.count}
            </div>
            <div
              className={cn(
                'w-full min-w-0.75 rounded-t transition-all',
                color,
                bucket.count === 0 && 'bg-muted',
              )}
              style={{
                height: `${Math.max((bucket.count / maxBucket) * 100, bucket.count > 0 ? 4 : 1)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
