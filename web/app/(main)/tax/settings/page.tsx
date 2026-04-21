'use client';
import { useState } from 'react';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const gstSchema = z.object({
  gstin: z.string().length(15, 'GSTIN must be exactly 15 characters'),
  tradeName: z.string().min(1, 'Trade name is required'),
  legalName: z.string().min(1, 'Legal name is required'),
  registrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED']),
  placeOfBusiness: z.string().optional(),
  pan: z.string().length(10, 'PAN must be 10 characters').optional().or(z.literal('')),
});

type GSTFormData = z.infer<typeof gstSchema>;

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];

export default function GSTSettingsPage() {
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: gstProfile, isLoading } = clientTrpc.tax.getGstProfile.useQuery(
    { businessId: activeBusiness?.id ?? '' },
    { enabled: !!activeBusiness?.id },
  );

  const { mutate: upsertProfile, isPending } = clientTrpc.tax.upsertGstProfile.useMutation({
    onSuccess: () => {
      toast.success('GST profile saved');
      utils.tax.getGstProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<GSTFormData>({
    resolver: zodResolver(gstSchema),
    values: gstProfile
      ? {
          gstin: gstProfile.gstin,
          tradeName: gstProfile.tradeName,
          legalName: gstProfile.legalName,
          registrationType: gstProfile.registrationType as GSTFormData['registrationType'],
          placeOfBusiness: gstProfile.placeOfBusiness ?? '',
          pan: gstProfile.pan ?? '',
        }
      : { gstin: '', tradeName: '', legalName: '', registrationType: 'REGULAR', placeOfBusiness: '', pan: '' },
  });

  function onSubmit(data: GSTFormData) {
    if (!activeBusiness?.id) return;
    upsertProfile({ businessId: activeBusiness.id, ...data });
  }

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle title="GST Settings" subtitle="Configure your GST registration details" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>GST Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gstin">GSTIN *</Label>
                <Input
                  id="gstin"
                  placeholder="22AAAAA0000A1Z5"
                  className="uppercase"
                  {...form.register('gstin')}
                />
                {form.formState.errors.gstin && (
                  <p className="text-destructive text-xs">{form.formState.errors.gstin.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  placeholder="AAAAA0000A"
                  className="uppercase"
                  {...form.register('pan')}
                />
                {form.formState.errors.pan && (
                  <p className="text-destructive text-xs">{form.formState.errors.pan.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="legalName">Legal Name *</Label>
                <Input id="legalName" {...form.register('legalName')} />
                {form.formState.errors.legalName && (
                  <p className="text-destructive text-xs">{form.formState.errors.legalName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tradeName">Trade Name *</Label>
                <Input id="tradeName" {...form.register('tradeName')} />
                {form.formState.errors.tradeName && (
                  <p className="text-destructive text-xs">{form.formState.errors.tradeName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Registration Type *</Label>
              <Controller
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="COMPOSITION">Composition</SelectItem>
                      <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="placeOfBusiness">Place of Business</Label>
              <Input
                id="placeOfBusiness"
                placeholder="e.g. Maharashtra"
                {...form.register('placeOfBusiness')}
              />
            </div>

            {gstProfile?.stateCode && (
              <div className="text-muted-foreground text-sm">
                State Code (from GSTIN):{' '}
                <span className="font-medium text-foreground">
                  {gstProfile.stateCode} —{' '}
                  {INDIAN_STATES.find((s) => s.code === gstProfile.stateCode)?.name ?? 'Unknown'}
                </span>
              </div>
            )}

            <Button type="submit" disabled={isPending} className="self-start">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save GST Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
