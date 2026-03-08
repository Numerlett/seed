'use client';

import { clientTrpc } from '@seed/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/providers/SessionProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  LoaderCircleIcon,
  LogOutIcon,
  MonitorIcon,
  ShieldIcon,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import UserAvatar from '@/components/profile/UserAvatar';

export default function AccountPage() {
  const { user, status, logOut } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  const { data: sessionsData } = clientTrpc.auth.getActiveSessions.useQuery();

  const updateUserMutation = clientTrpc.auth.updateUser.useMutation({
    onSuccess: async () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    await updateUserMutation.mutateAsync({ name: name.trim() });
  };

  const handleLogout = async () => {
    await logOut(true);
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/account');
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and security
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">
                {user.name || 'No name set'}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing || updateUserMutation.isPending}
                  placeholder="Enter your name"
                />
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit</Button>
                ) : (
                  <>
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <>
                          <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(user.name || '');
                        setIsEditing(false);
                      }}
                      disabled={updateUserMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-muted-foreground text-xs">
                Email address cannot be changed
              </p>
            </div>

            {user.phone && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={user.phone}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security & Sessions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted rounded-lg p-2">
                <MonitorIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Login Activity</p>
                <p className="text-muted-foreground text-sm">
                  {sessionsData?.sessions
                    ? `${sessionsData.sessions.length} active ${sessionsData.sessions.length === 1 ? 'session' : 'sessions'}`
                    : 'Manage devices where you\u2019re logged in'}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/account/sessions">View All</Link>
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Created</p>
              <p className="text-muted-foreground text-sm">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-muted-foreground text-sm">
                {new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
