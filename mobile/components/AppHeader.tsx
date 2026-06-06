import { useRouter } from 'expo-router';
import { Building2, Check, ChevronDown, Plus, UserCircle2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trpc } from '../lib/trpc';
import { errorMessage } from '../lib/utils';
import { useBusiness } from '../providers/BusinessProvider';
import { useToast } from './ui';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { activeBusiness, memberships, switchBusiness, activeMembership, refetch } =
    useBusiness();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const createMutation = trpc.business.createNewBusiness.useMutation({
    onSuccess: async (created) => {
      toast.success('Business created');
      setName('');
      setCreating(false);
      await utils.business.getBusinessesMemberships.invalidate();
      refetch();
      if (created?.id) switchBusiness(created.id);
      setOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <View
      style={{ paddingTop: insets.top + 6 }}
      className="flex-row items-center justify-between border-b border-border bg-background px-4 pb-3"
    >
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-1 flex-row items-center gap-2 active:opacity-70"
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Building2 size={18} color="#1c1917" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {activeBusiness?.name ?? 'Select business'}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-muted-foreground">
              {activeMembership?.role ?? 'Tap to switch'}
            </Text>
            <ChevronDown size={12} color="#78716c" />
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push('/account')}
        className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
      >
        <UserCircle2 size={22} color="#1c1917" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
        >
          <Pressable className="max-h-[75%] rounded-t-3xl bg-background p-4">
            <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-border" />
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Your businesses
            </Text>

            {memberships.map((m) => {
              const isActive = m.id === activeMembership?.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    switchBusiness(m.id);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-border py-3"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-base text-foreground">
                      {m.business?.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{m.role}</Text>
                  </View>
                  {isActive ? <Check size={18} color="#16a34a" /> : null}
                </Pressable>
              );
            })}

            {creating ? (
              <View className="mt-4 gap-2">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="New business name"
                  placeholderTextColor="#a8a29e"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-base text-foreground"
                  autoFocus
                />
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      setCreating(false);
                      setName('');
                    }}
                    className="h-11 flex-1 items-center justify-center rounded-xl border border-border"
                  >
                    <Text className="font-medium text-foreground">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => name.trim() && createMutation.mutate({ name: name.trim() })}
                    disabled={createMutation.isPending}
                    className="h-11 flex-1 items-center justify-center rounded-xl bg-primary"
                  >
                    <Text className="font-semibold text-primary-foreground">
                      {createMutation.isPending ? 'Creating…' : 'Create'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setCreating(true)}
                className="mt-4 flex-row items-center gap-2 rounded-xl bg-muted px-4 py-3 active:opacity-70"
              >
                <Plus size={18} color="#1c1917" />
                <Text className="font-medium text-foreground">New business</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
