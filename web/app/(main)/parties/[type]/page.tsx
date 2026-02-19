import PartiesTable from '@/components/parties/PartiesTable';

export default async function PartyPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  return <PartiesTable type={type as 'customers' | 'suppliers'} />;
}
