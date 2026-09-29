import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Screen, Text } from '@/components';
import { EventForm } from '@/components/event-form/EventForm';
import { loadEventForm, type EventForm as Form } from '@/lib/events';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<Form | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadEventForm(id)
      .then(setInitial)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this event.'));
  }, [id]);

  if (initial) return <EventForm initial={initial} />;

  return (
    <Screen>
      <Text variant="body" tone={error ? 'danger' : 'muted'}>{error ?? 'Loading…'}</Text>
      {error && <Button label="Back" variant="secondary" onPress={() => router.back()} />}
    </Screen>
  );
}
