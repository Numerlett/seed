'use client';
import Link from 'next/link';
import PageTitle from '@/components/main/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Receipt, Package, AlertTriangle } from 'lucide-react';

const tiles = [
  { title: 'Sales Register', description: 'All confirmed invoices for a period', href: '/reports/sales-register', icon: Receipt },
  { title: 'Purchase Register', description: 'All confirmed purchase orders for a period', href: '/reports/purchase-register', icon: ShoppingCart },
  { title: 'Stock Summary', description: 'Current stock levels across all warehouses', href: '/reports/stock-summary', icon: Package },
  { title: 'Low Stock Alert', description: 'Items at or below reorder level', href: '/reports/low-stock', icon: AlertTriangle },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Reports" subtitle="Operational and financial reports" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href}>
              <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary h-5 w-5" />
                    <CardTitle className="text-base">{tile.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent><CardDescription>{tile.description}</CardDescription></CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
