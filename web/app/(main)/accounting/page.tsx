'use client';
import Link from 'next/link';
import PageTitle from '@/components/main/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, BarChart2, Scale, List } from 'lucide-react';

const tiles = [
  { title: 'Chart of Accounts', description: 'View and manage accounts', href: '/accounting/chart-of-accounts', icon: List },
  { title: 'Journal Entries', description: 'Post manual journal vouchers', href: '/accounting/journal', icon: BookOpen },
  { title: 'Trial Balance', description: 'Closing balances for all accounts', href: '/accounting/trial-balance', icon: Scale },
  { title: 'Profit & Loss', description: 'Income statement for a period', href: '/accounting/pnl', icon: BarChart2 },
  { title: 'Balance Sheet', description: 'Assets, liabilities, and equity as of date', href: '/accounting/balance-sheet', icon: FileText },
];

export default function AccountingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="Accounting" subtitle="Double-entry ledger, financial statements" />
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
                <CardContent>
                  <CardDescription>{tile.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
