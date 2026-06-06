import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { PartyForm } from '../../components/PartyForm';
import {
  Badge,
  Button,
  Card,
  CardLabel,
  Screen,
  Spinner,
  confirm,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function PartyDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const query = trpc.party.getPartyById.useQuery(
    { id: id ?? '' },
    { enabled: !!id },
  );

  const updateParty = trpc.party.updateParty.useMutation({
    onSuccess: () => {
      toast.success('Party updated');
      utils.party.getPartiesByBusinessId.invalidate();
      utils.party.getPartyById.invalidate({ id });
      setEditing(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteParty = trpc.party.deleteParty.useMutation({
    onSuccess: () => {
      toast.success('Party deleted');
      utils.party.getPartiesByBusinessId.invalidate();
      utils.dashboard.getDashboardData.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const party = query.data;

  if (query.isLoading || !party) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Party' }} />
        <Spinner />
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit Party' }} />
        <PartyForm
          submitLabel="Update Party"
          submitting={updateParty.isPending}
          initial={{
            name: party.name,
            email: party.email ?? '',
            phone: party.phone ?? '',
            partyType: party.partyType,
          }}
          onSubmit={(payload) =>
            updateParty.mutate({ id: party.id, data: payload })
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Party' }} />
      <View className="gap-4">
        <View>
          <Text className="text-xl font-bold text-foreground">{party.name}</Text>
          <Badge
            className="mt-1"
            label={party.partyType === 'BOTH' ? 'Customer & Supplier' : party.partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
            tone={party.partyType === 'SUPPLIER' ? 'warning' : 'info'}
          />
        </View>

        <Card className="gap-3">
          <View>
            <CardLabel>Email</CardLabel>
            <Text className="text-base text-foreground">{party.email || '—'}</Text>
          </View>
          <View>
            <CardLabel>Phone</CardLabel>
            <Text className="text-base text-foreground">{party.phone || '—'}</Text>
          </View>
        </Card>

        {party.addresses?.length ? (
          <Card className="gap-2">
            <CardLabel>Addresses</CardLabel>
            {party.addresses.map((a) => (
              <Text key={a.id} className="text-sm text-foreground">
                {[a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            ))}
          </Card>
        ) : null}

        <View className="gap-2">
          <Button label="Edit Party" onPress={() => setEditing(true)} />
          <Button
            label="Delete Party"
            variant="destructive"
            loading={deleteParty.isPending}
            onPress={() =>
              confirm({
                title: 'Delete party?',
                message: 'This cannot be undone.',
                confirmLabel: 'Delete',
                destructive: true,
                onConfirm: () =>
                  businessId &&
                  deleteParty.mutate({ id: party.id, businessId }),
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
