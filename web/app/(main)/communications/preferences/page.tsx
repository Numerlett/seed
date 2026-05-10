'use client';
import PageTitle from '@/components/main/PageTitle';
import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type PrefKey =
  | 'emailEnabled'
  | 'smsEnabled'
  | 'whatsappEnabled'
  | 'lowStockAlerts'
  | 'paymentReminders';

const channelToggles: { key: PrefKey; label: string; description: string }[] = [
  {
    key: 'emailEnabled',
    label: 'Email notifications',
    description: 'Receive notifications by email',
  },
  {
    key: 'smsEnabled',
    label: 'SMS notifications',
    description: 'Receive notifications by SMS',
  },
  {
    key: 'whatsappEnabled',
    label: 'WhatsApp notifications',
    description: 'Receive notifications on WhatsApp',
  },
];

const eventToggles: { key: PrefKey; label: string; description: string }[] = [
  {
    key: 'lowStockAlerts',
    label: 'Low stock alerts',
    description: 'Notify when items hit reorder level',
  },
  {
    key: 'paymentReminders',
    label: 'Payment reminders',
    description: 'Notify about pending payments',
  },
];

export default function PreferencesPage() {
  const utils = clientTrpc.useUtils();
  const { data, isLoading } =
    clientTrpc.communications.getMyPreferences.useQuery();

  const { mutate, isPending } =
    clientTrpc.communications.updateMyPreferences.useMutation({
      onSuccess: () => {
        toast.success('Preferences updated');
        utils.communications.getMyPreferences.invalidate();
      },
      onError: (err) => toast.error(err.message),
    });

  function handleToggle(key: PrefKey, value: boolean) {
    mutate({ [key]: value });
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageTitle title="Notification Preferences" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="Notification Preferences"
        subtitle="Choose which notifications you receive and on which channels"
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {channelToggles.map((toggle, i) => (
            <div key={toggle.key}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={toggle.key} className="cursor-pointer">
                    {toggle.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {toggle.description}
                  </p>
                </div>
                <Switch
                  id={toggle.key}
                  disabled={isPending}
                  checked={data[toggle.key]}
                  onCheckedChange={(v) => handleToggle(toggle.key, v)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {eventToggles.map((toggle, i) => (
            <div key={toggle.key}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={toggle.key} className="cursor-pointer">
                    {toggle.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {toggle.description}
                  </p>
                </div>
                <Switch
                  id={toggle.key}
                  disabled={isPending}
                  checked={data[toggle.key]}
                  onCheckedChange={(v) => handleToggle(toggle.key, v)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isPending && (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </p>
      )}
    </div>
  );
}
