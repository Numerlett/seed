'use client';
import DashboardCards from '@/components/dashboard/DashboardCards';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';

export default function DashboardPage() {
  const { currentBusinessMembership } = useBusiness();

  return (
    <>
      <div className="bg-background sticky top-0 z-10 mb-3 flex flex-row items-center justify-between border-b px-3">
        <PageTitle />
      </div>
      <DashboardCards businessId={currentBusinessMembership?.business.id} />
    </>
  );
}
