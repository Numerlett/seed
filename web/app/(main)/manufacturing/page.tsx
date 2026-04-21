'use client';
import Link from 'next/link';
import PageTitle from '@/components/main/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, ClipboardList } from 'lucide-react';

const tiles = [
  { title: 'Bills of Materials', description: 'Define product recipes and components', href: '/manufacturing/boms', icon: GitBranch },
  { title: 'Work Orders', description: 'Plan and track production runs', href: '/manufacturing/work-orders', icon: ClipboardList },
];

export default function ManufacturingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Manufacturing" subtitle="BOM, work orders, production tracking" />
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
