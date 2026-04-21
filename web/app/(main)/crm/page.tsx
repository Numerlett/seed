'use client';
import Link from 'next/link';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckSquare } from 'lucide-react';

export default function CRMPage() {
  const { activeBusiness } = useBusiness();
  const { data: leads } = clientTrpc.crm.getLeads.useQuery(
    { businessId: activeBusiness?.id ?? '', limit: 5 },
    { enabled: !!activeBusiness?.id },
  );

  const tiles = [
    { title: 'Leads Pipeline', description: 'Track prospects from contact to close', href: '/crm/leads', icon: Users, stat: leads?.total },
    { title: 'Tasks', description: 'Follow-ups, reminders, and actions', href: '/crm/tasks', icon: CheckSquare, stat: null },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="CRM" subtitle="Leads, activities, and customer follow-ups" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href}>
              <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="text-primary h-5 w-5" />
                      <CardTitle className="text-base">{tile.title}</CardTitle>
                    </div>
                    {tile.stat != null && (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                        {tile.stat}
                      </span>
                    )}
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
