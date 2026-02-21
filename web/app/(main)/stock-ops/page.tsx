'use client';

import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import StockSummaryTable from '@/components/stock/StockSummaryTable';
import LowStockAlerts from '@/components/stock/LowStockAlerts';
import InventoryValuationCard from '@/components/stock/InventoryValuationCard';

export default function StockOpsPage() {
  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle title="Stock Operations" />
      </div>
      <Separator />
      <div className="space-y-6 p-6">
        {/* Quick Actions & Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InventoryValuationCard />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
              <ClipboardList className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Link href="/stock-ops/adjustments">
                <Button variant="outline" className="w-full">
                  Manage Adjustments
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfers</CardTitle>
              <ArrowLeftRight className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Link href="/stock-ops/transfers">
                <Button variant="outline" className="w-full">
                  Manage Transfers
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Damage Reports
              </CardTitle>
              <AlertTriangle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Link href="/stock-ops/damage-reports">
                <Button variant="outline" className="w-full">
                  Manage Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockAlerts />
          </CardContent>
        </Card>

        {/* Stock Summary Table */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Stock Summary</h2>
          <StockSummaryTable />
        </div>
      </div>
    </>
  );
}
