'use client';
import { useParams, useRouter } from 'next/navigation';
import PageTitle from '@/components/main/PageTitle';
import { useBusiness } from '@/providers/BusinessProvider';
import { clientTrpc } from '@seed/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Body is required'),
  isActive: z.boolean(),
  isDefault: z.boolean(),
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

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeBusiness } = useBusiness();
  const utils = clientTrpc.useUtils();

  const { data: template, isLoading } =
    clientTrpc.communications.getTemplateById.useQuery(
      { businessId: activeBusiness?.id ?? '', id: params.id },
      { enabled: !!activeBusiness?.id && !!params.id },
    );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, isDefault: false },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject ?? '',
        body: template.body,
        isActive: template.isActive,
        isDefault: template.isDefault,
      });
    }
  }, [template, form]);

  const body = form.watch('body') ?? '';
  const detectedVars = useMemo(() => extractVariables(body), [body]);

  const { mutate, isPending } =
    clientTrpc.communications.updateTemplate.useMutation({
      onSuccess: () => {
        toast.success('Template updated');
        utils.communications.getTemplates.invalidate();
        utils.communications.getTemplateById.invalidate();
        router.push('/communications/templates');
      },
      onError: (err) => toast.error(err.message),
    });

  function onSubmit(data: FormData) {
    if (!activeBusiness?.id || !template) return;
    mutate({
      businessId: activeBusiness.id,
      id: template.id,
      name: data.name,
      subject: data.subject || undefined,
      body: data.body,
      isActive: data.isActive,
      isDefault: data.isDefault,
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageTitle title="Edit Template" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageTitle title="Template not found" />
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPlatformTemplate = template.businessId === null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title={`Edit: ${template.name}`}
        subtitle={`${template.type.replace(/_/g, ' ')} · ${template.channel}`}
      />
      {isPlatformTemplate && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="py-4">
            <p className="text-sm">
              This is a platform-level template. It cannot be edited from this
              business — copy it as a new template instead.
            </p>
          </CardContent>
        </Card>
      )}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Name *</Label>
              <Input
                disabled={isPlatformTemplate}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {template.channel === 'EMAIL' && (
              <div className="flex flex-col gap-1.5">
                <Label>Subject</Label>
                <Input
                  disabled={isPlatformTemplate}
                  {...form.register('subject')}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Body *</Label>
              <Textarea
                rows={8}
                disabled={isPlatformTemplate}
                {...form.register('body')}
              />
              {form.formState.errors.body && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.body.message}
                </p>
              )}
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Variables:</span>
                  {detectedVars.map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={form.watch('isActive')}
                disabled={isPlatformTemplate}
                onCheckedChange={(v) => form.setValue('isActive', !!v)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={form.watch('isDefault')}
                disabled={isPlatformTemplate}
                onCheckedChange={(v) => form.setValue('isDefault', !!v)}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Mark as default for this type + channel
              </Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || isPlatformTemplate}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
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
