'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building2,
  ShieldCheck,
  Activity,
  TrendingUp,
  UserPlus,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } =
    clientTrpc.admin.analytics.getPlatformStats.useQuery();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Platform Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Total Businesses"
          value={stats?.totalBusinesses}
          icon={Building2}
          loading={isLoading}
        />
        <StatCard
          title="Active Admins"
          value={stats?.totalAdmins}
          icon={ShieldCheck}
          loading={isLoading}
        />
        <StatCard
          title="Active Sessions"
          value={stats?.activeSessions}
          icon={Activity}
          loading={isLoading}
        />
      </div>

      {/* Growth Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserPlus className="text-primary size-5" />
              <h3 className="font-semibold">New Users</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Last 7 days</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.newUsersLast7d}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Last 30 days</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.newUsersLast30d}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary size-5" />
              <h3 className="font-semibold">New Businesses</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Last 7 days</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.newBusinessesLast7d}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Last 30 days</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.newBusinessesLast30d}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="bg-primary/10 rounded-lg p-3">
          <Icon className="text-primary size-6" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
