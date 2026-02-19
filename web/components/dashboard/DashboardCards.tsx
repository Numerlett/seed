'use client';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { clientTrpc } from '@seed/api/client';
import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

export default function DashboardCards({
  businessId,
}: {
  businessId?: string;
}) {
  const { data, error, isPending } =
    clientTrpc.dashboard.getDashboardData.useQuery(
      { businessId: businessId as string },
      { enabled: typeof businessId === 'string' },
    );

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-destructive">Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className="grid-col-2 grid gap-3 px-3 md:grid-cols-3 lg:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Products</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isPending ? 'Loading...' : data.productCount}
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <Link href="/inventory">
            <Button variant="link" size="sm" disabled={isPending}>
              View all <ExternalLinkIcon />
            </Button>
          </Link>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isPending ? 'Loading...' : data.customerCount}
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <Link href="/parties/customers">
            <Button variant="link" size="sm" disabled={isPending}>
              View all <ExternalLinkIcon />
            </Button>
          </Link>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Suppliers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isPending ? 'Loading...' : data.supplierCount}
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <Link href="/parties/suppliers">
            <Button variant="link" size="sm" disabled={isPending}>
              View all <ExternalLinkIcon />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
