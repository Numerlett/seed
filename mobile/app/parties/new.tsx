import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { PartyForm } from '../../components/PartyForm';
import { Screen, useToast } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function NewPartyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { businessId } = useBusiness();
  const utils = trpc.useUtils();

  const createParty = trpc.party.createParty.useMutation({
    onSuccess: () => {
      toast.success('Party created');
      utils.party.getPartiesByBusinessId.invalidate();
      utils.dashboard.getDashboardData.invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Party' }} />
      <PartyForm
        submitLabel="Create Party"
        submitting={createParty.isPending}
        onSubmit={(payload) =>
          businessId && createParty.mutate({ ...payload, businessId })
        }
      />
    </Screen>
  );
}
