import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  ActivityRow,
  Bold,
  Button,
  Card,
  EventCard,
  EventCarousel,
  Icon,
  IconButton,
  Input,
  InviteCard,
  Screen,
  SectionHeader,
  Tabs,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import { loadMyEvents, parseInviteCode, type MyEvent } from '@/lib/events';
import { loadFeed, verbText, type FeedItem } from '@/lib/feed';
import { formatLongDate, formatWhen, relativeUntil, timeAgo } from '@/lib/format';
import { loadMyGoing, loadMyInvites, rsvpHref, setRsvp, type GoingEvent, type MyInvite, type RsvpStatus } from '@/lib/rsvp';
import { spacing } from '@/theme/tokens';

type FeedTab = 'friends' | 'invites';

/** Home (design 6b): going + hosting carousels, then Friends / Invites. */
export default function HomeScreen() {
  const { session, profile, pendingInvite, clearPendingInvite, showNotice } = useAuth();
  const userId = session?.user.id;
  const firstName = profile?.name.split(' ')[0] || 'there';

  const [going, setGoing] = useState<GoingEvent[] | null>(null);
  const [hosting, setHosting] = useState<MyEvent[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  const [tab, setTab] = useState<FeedTab>('friends');
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  // Invites answered on this visit stay visible (for Undo) until Home reloads.
  const [justAnswered, setJustAnswered] = useState<Set<string>>(new Set());
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState<string>();

  const reload = useCallback(() => {
    if (!userId) return;
    loadMyGoing().then(setGoing).catch(() => setGoing([]));
    loadMyEvents(userId).then(setHosting).catch(() => setHosting([]));
    loadFeed().then(setFeed).catch(() => setFeed([]));
    loadMyInvites().then(setInvites).catch(() => setInvites([]));
    setJustAnswered(new Set());
  }, [userId]);

  // Reload whenever Home comes back into view (after RSVPing, editing, …).
  useFocusEffect(reload);

  // An invite link opened before signing in: continue to it now.
  useEffect(() => {
    if (!pendingInvite) return;
    clearPendingInvite();
    router.push({ pathname: '/invite/[code]', params: { code: pendingInvite } });
  }, [pendingInvite, clearPendingInvite]);

  const openEvent = (id: string) => router.push({ pathname: '/events/[id]', params: { id } });

  const reply = async (invite: MyInvite, status: RsvpStatus | null) => {
    // With a questionnaire, Accept only opens the questions: you're going once you submit them.
    if (status === 'yes' && invite.has_questions) {
      router.push(rsvpHref(invite.event_id));
      return;
    }
    setBusyInvite(invite.event_id);
    try {
      const result = await setRsvp(invite.event_id, status);
      setInvites((list) => list?.map((i) => (i.event_id === invite.event_id ? { ...i, my_status: result.status } : i)) ?? null);
      setJustAnswered((set) => new Set(set).add(invite.event_id));
      if (result.waitlisted) showNotice(`The event is full — you're #${result.waitlist_rank} on the waitlist.`);
      loadMyGoing().then(setGoing).catch(() => {});
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'Could not save your reply.');
    } finally {
      setBusyInvite(null);
    }
  };

  const openInvite = () => {
    const code = parseInviteCode(inviteInput);
    if (!code) return setInviteError('Paste the whole invite link, or just the code.');
    setInviteError(undefined);
    setInviteInput('');
    router.push({ pathname: '/invite/[code]', params: { code } });
  };

  // Only invites you haven't replied to (accepted ones live under "You're going").
  const shownInvites = invites?.filter((i) => i.my_status === null || justAnswered.has(i.event_id)) ?? null;
  const pendingInvites = invites?.filter((i) => i.my_status === null).length ?? 0;

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.xxs }}>
          <Text variant="eyebrow">{formatLongDate(new Date())}</Text>
          <Text variant="title">Hey {firstName}</Text>
        </View>
        <IconButton
          icon={<Icon name={{ ios: 'bell', android: 'notifications' }} />}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications"
        />
      </View>

      {/* You're going */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="You're going" />
        {going === null && <Text variant="small" tone="muted">Loading…</Text>}
        {going?.length === 0 && (
          <Card>
            <Text variant="body" tone="strong">Nothing lined up yet. Accept an invite below, or find something in Explore.</Text>
          </Card>
        )}
        {!!going?.length && (
          <EventCarousel>
            {going.map((e) => (
              <EventCard
                key={e.event_id}
                title={e.title}
                meta={[formatWhen(e.date_time), e.location, `${e.going_count} going`].filter(Boolean).join(' · ')}
                imageUrl={e.cover_image}
                badge={e.waitlisted ? 'Waitlist' : relativeUntil(e.date_time) ?? undefined}
                onPress={() => openEvent(e.event_id)}
              />
            ))}
          </EventCarousel>
        )}
      </View>

      {/* Your events */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Your events" />
        {hosting === null && <Text variant="small" tone="muted">Loading…</Text>}
        {hosting?.length === 0 && (
          <Card>
            <Text variant="body" tone="strong">No events yet. Tap the + below to host one.</Text>
          </Card>
        )}
        {!!hosting?.length && (
          <EventCarousel>
            {hosting.map((e) => (
              <EventCard
                key={e.id}
                title={e.title}
                meta={
                  e.status === 'draft'
                    ? [formatWhen(e.date_time), 'Draft'].join(' · ')
                    : [formatWhen(e.date_time), `${e.goingCount} going`, e.pendingCount ? `${e.pendingCount} pending` : null]
                        .filter(Boolean)
                        .join(' · ')
                }
                imageUrl={e.cover_image}
                badge={e.status === 'published' && e.visibility === 'private' ? 'Private' : undefined}
                dimmed={e.status === 'draft'}
                actionLabel="Manage"
                onAction={() => router.push({ pathname: '/events/[id]/edit', params: { id: e.id } })}
                onPress={() => openEvent(e.id)}
              />
            ))}
          </EventCarousel>
        )}
      </View>

      {/* Friends | Invites */}
      <View style={{ gap: spacing.md }}>
        <Tabs
          tabs={[
            { key: 'friends', label: 'Friends' },
            { key: 'invites', label: pendingInvites ? `Invites · ${pendingInvites}` : 'Invites' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'friends' && (
          <View style={{ gap: spacing.md }}>
            {feed === null && <Text variant="small" tone="muted">Loading…</Text>}
            {feed?.length === 0 && (
              <Text variant="body" tone="muted">
                When people you follow host or join public events, it shows up here.
              </Text>
            )}
            {feed?.map((item) => (
              <ActivityRow
                key={`${item.verb}-${item.actor_id}-${item.event_id ?? item.target_user_id}-${item.at}`}
                time={timeAgo(item.at)}
                thumbUrl={item.thumb}
                thumbShape={item.verb === 'followed' ? 'circle' : 'rounded'}
                onPress={item.event_id ? () => openEvent(item.event_id!) : undefined}
              >
                <Bold>{item.actor_name}</Bold> {verbText[item.verb]} <Bold>{item.target}</Bold>
              </ActivityRow>
            ))}
          </View>
        )}

        {tab === 'invites' && (
          <View style={{ gap: spacing.md }}>
            {shownInvites === null && <Text variant="small" tone="muted">Loading…</Text>}
            {shownInvites?.length === 0 && <Text variant="body" tone="muted">No invites waiting for a reply.</Text>}
            {shownInvites?.map((i) => (
              <InviteCard
                key={i.event_id}
                inviterName={i.inviter_name}
                inviterAvatarUrl={i.inviter_avatar_url}
                title={i.title}
                coverUrl={i.cover_image}
                friendsGoing={i.friends_going}
                when={formatWhen(i.date_time)}
                where={i.location}
                status={i.my_status}
                busy={busyInvite === i.event_id}
                onAccept={() => reply(i, 'yes')}
                onDecline={() => reply(i, 'no')}
                onUndo={() => reply(i, null)}
                onPress={() => openEvent(i.event_id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Paste an invite link or code */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Got an invite link?" />
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
