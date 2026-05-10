'use client';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

const messageTypes = [
  'INVOICE',
  'PAYMENT_REMINDER',
  'PAYMENT_RECEIVED',
  'GRN_RECEIVED',
  'LOW_STOCK',
  'OTP',
  'WELCOME',
  'CUSTOM',
] as const;

const messageChannels = ['EMAIL', 'SMS', 'WHATSAPP'] as const;

const schema = z.object({
  type: z.enum(messageTypes),
  channel: z.enum(messageChannels),
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Body is required'),
  isDefault: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      out.push(match[1]);
    }
  }
  return out;
}

export default function NewTemplatePage() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();
  const utils = clientTrpc.useUtils();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'CUSTOM', channel: 'EMAIL' },
  });

  const channel = form.watch('channel');
  const body = form.watch('body') ?? '';
  const detectedVars = useMemo(() => extractVariables(body), [body]);

  const { mutate, isPending } = clientTrpc.communications.createTemplate.useMutation({
    onSuccess: () => {
      toast.success('Template created');
      utils.communications.getTemplates.invalidate();
      router.push('/communications/templates');
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(data: FormData) {
    if (!activeBusiness?.id) return;
    mutate({
      businessId: activeBusiness.id,
      type: data.type,
      channel: data.channel,
      name: data.name,
      subject: data.subject || undefined,
      body: data.body,
      isDefault: data.isDefault ?? false,
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="New Message Template"
        subtitle="Use {{variable}} placeholders for dynamic content"
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Type *</Label>
                <Select
                  defaultValue="CUSTOM"
                  onValueChange={(v) => form.setValue('type', v as FormData['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {messageTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Channel *</Label>
                <Select
                  defaultValue="EMAIL"
                  onValueChange={(v) =>
                    form.setValue('channel', v as FormData['channel'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {messageChannels.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Invoice email — premium customers"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {channel === 'EMAIL' && (
              <div className="flex flex-col gap-1.5">
                <Label>Subject</Label>
                <Input
                  placeholder="Invoice {{invoiceNumber}} from {{businessName}}"
                  {...form.register('subject')}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Body *</Label>
              <Textarea
                rows={8}
                placeholder="Hi {{customerName}}, your invoice {{invoiceNumber}} for ₹{{amount}} is due on {{dueDate}}."
                {...form.register('body')}
              />
              {form.formState.errors.body && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.body.message}
                </p>
              )}
              {detectedVars.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Detected variables: {detectedVars.map((v) => `{{${v}}}`).join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                onCheckedChange={(v) => form.setValue('isDefault', !!v)}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Mark as default template for this type + channel
              </Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
