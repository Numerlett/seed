'use client';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Receipt, BarChart2, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export default function TaxPage() {
  const { activeBusiness } = useBusiness();
  const { data: gstProfile, isLoading } = clientTrpc.tax.getGstProfile.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const tiles = [
    {
      title: 'E-Invoices',
      description: 'Generate and manage IRN for B2B invoices',
      href: '/tax/einvoices',
      icon: FileText,
    },
    {
      title: 'E-Way Bills',
      description: 'Generate e-way bills for goods movement',
      href: '/tax/ewaybills',
      icon: Receipt,
    },
    {
      title: 'GSTR-1 Preview',
      description: 'Review outward supply returns before filing',
      href: '/tax/gstr1',
      icon: BarChart2,
    },
    {
      title: 'GSTR-3B Preview',
      description: 'Summary return with net tax liability',
      href: '/tax/gstr3b',
      icon: BarChart2,
    },
    {
      title: 'GST Settings',
      description: 'Configure GSTIN, registration type, state',
      href: '/tax/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Tax & GST" subtitle="E-invoicing, e-way bills, and GST returns" />
        {!isLoading && (
          <div className="flex items-center gap-2">
            {gstProfile ? (
              <>
                <CheckCircle className="text-green-500 h-4 w-4" />
                <span className="text-sm font-medium">{gstProfile.gstin}</span>
                <Badge variant="outline">{gstProfile.registrationType}</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-500 h-4 w-4" />
                <span className="text-sm text-muted-foreground">GST not configured</span>
                <Button asChild size="sm" variant="outline">
                  <Link href="/tax/settings">Setup GST</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

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
