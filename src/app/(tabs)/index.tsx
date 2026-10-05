import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Avatar, Button, Card, EventCard, Input, Screen, SectionHeader, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { loadMyEvents, parseInviteCode, type MyEvent } from '@/lib/events';
import { formatWhen } from '@/lib/format';
import { spacing } from '@/theme/tokens';

/** Placeholder Home until the feed (design 6b) is built: your events + join by invite code. */
export default function HomeScreen() {
  const { session, profile, pendingInvite, clearPendingInvite } = useAuth();
  const userId = session?.user.id;
  const firstName = profile?.name.split(' ')[0] || 'there';

  const [events, setEvents] = useState<MyEvent[] | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState<string>();

  // Reload whenever Home comes back into view (e.g. after creating or editing an event).
  useFocusEffect(
    useCallback(() => {
      if (userId) loadMyEvents(userId).then(setEvents).catch(() => setEvents([]));
    }, [userId]),
  );

  // An invite link opened before signing in: continue to it now.
  useEffect(() => {
    if (!pendingInvite) return;
    clearPendingInvite();
    router.push({ pathname: '/invite/[code]', params: { code: pendingInvite } });
  }, [pendingInvite, clearPendingInvite]);

  const openInvite = () => {
    const code = parseInviteCode(inviteInput);
    if (!code) return setInviteError('Paste the whole invite link, or just the code.');
    setInviteError(undefined);
    setInviteInput('');
    router.push({ pathname: '/invite/[code]', params: { code } });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={profile?.name ?? '?'} uri={profile?.avatar_url} size="lg" />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="title">Hey {firstName}</Text>
          {profile?.username && <Text variant="small" tone="muted">@{profile.username}</Text>}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Your events" />
        {events === null && <Text variant="small" tone="muted">Loading…</Text>}
        {events?.length === 0 && (
          <Card>
            <Text variant="body" tone="strong">No events yet. Tap the + below to host one.</Text>
          </Card>
        )}
        {!!events?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, alignItems: 'flex-start' }}>
            {events.map((e) => (
              <EventCard
                key={e.id}
                title={e.title}
                meta={[formatWhen(e.date_time), e.location].filter(Boolean).join(' · ')}
                imageUrl={e.cover_image}
                badge={e.status === 'published' && e.visibility === 'private' ? 'Private' : undefined}
                dimmed={e.status === 'draft'}
                actionLabel="Manage"
                onAction={() => router.push({ pathname: '/events/[id]/edit', params: { id: e.id } })}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Got an invite?" />
        <Input
          value={inviteInput}
          onChangeText={setInviteInput}
          placeholder="Paste an invite link or code"
          autoCapitalize="none"
          autoCorrect={false}
          error={inviteError}
          onSubmitEditing={openInvite}
          returnKeyType="go"
        />
        <Button label="Open invite" variant="secondary" onPress={openInvite} disabled={!inviteInput.trim()} fullWidth />
      </View>
    </Screen>
  );
}
