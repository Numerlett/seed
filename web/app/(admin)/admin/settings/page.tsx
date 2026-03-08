'use client';

import { clientTrpc } from '@seed/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Settings, Save, Plus, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/providers/AdminProvider';

export default function AdminSettingsPage() {
  const { isSuperAdmin } = useAdmin();
  const utils = clientTrpc.useUtils();

  const { data, isLoading } = clientTrpc.admin.settings.getSettings.useQuery();

  const updateSetting = clientTrpc.admin.settings.updateSetting.useMutation({
    onSuccess: () => {
      toast.success('Setting updated');
      utils.admin.settings.getSettings.invalidate();
      setEditingKey(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update setting');
    },
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const startEditing = (key: string, currentValue: unknown) => {
    setEditingKey(key);
    setEditValue(
      typeof currentValue === 'string'
        ? currentValue
        : JSON.stringify(currentValue),
    );
  };

  const saveEdit = (key: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editValue);
    } catch {
      parsed = editValue;
    }
    updateSetting.mutate({ key, value: parsed });
  };

  const addSetting = () => {
    if (!newKey.trim()) {
      toast.error('Key is required');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      parsed = newValue;
    }
    updateSetting.mutate(
      { key: newKey.trim(), value: parsed },
      {
        onSuccess: () => {
          setNewKey('');
          setNewValue('');
          setShowAddForm(false);
          toast.success('Setting created');
          utils.admin.settings.getSettings.invalidate();
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Settings className="size-6" />
          System Settings
        </h2>
        {isSuperAdmin && (
          <Button
            size="sm"
            variant={showAddForm ? 'secondary' : 'default'}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <>
                <X className="mr-2 size-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Add Setting
              </>
            )}
          </Button>
        )}
      </div>

      {/* Add Setting Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Setting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Key
                </label>
                <Input
                  placeholder="e.g. maintenance_mode"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Value (JSON or string)
                </label>
                <Input
                  placeholder='e.g. true or "hello"'
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={addSetting}
              disabled={updateSetting.isPending}
            >
              <Save className="mr-2 size-4" />
              Create Setting
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settings List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.settings || data.settings.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No system settings configured yet.
            </div>
          ) : (
            <div className="divide-y">
              {data.settings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {setting.key}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {typeof setting.value === 'object'
                          ? 'JSON'
                          : typeof setting.value}
                      </Badge>
                    </div>

                    {editingKey === setting.key ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && saveEdit(setting.key)
                          }
                          className="max-w-md font-mono text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEdit(setting.key)}
                          disabled={updateSetting.isPending}
                        >
                          <Save className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingKey(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground max-w-2xl truncate font-mono text-sm">
                        {typeof setting.value === 'object'
                          ? JSON.stringify(setting.value)
                          : String(setting.value)}
                      </p>
                    )}
                  </div>

                  {isSuperAdmin && editingKey !== setting.key && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(setting.key, setting.value)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isSuperAdmin && (
        <p className="text-muted-foreground text-center text-sm">
          Only super admins can edit settings.
        </p>
      )}
    </div>
  );
}
