import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';

import {
  AvatarStack,
  Button,
  Card,
  CoverImage,
  Dialog,
  Divider,
  IconButton,
  PersonRow,
  Screen,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import { directionsUrl, inviteLink, loadEventPage, type EventPage, type Person } from '@/lib/events';
import { formatEventWhen } from '@/lib/format';
import { loadEventSocial, rsvpHref, setRsvp, socialLine, type EventSocial, type RsvpStatus } from '@/lib/rsvp';
import { sizes, spacing } from '@/theme/tokens';

/** Event page (design 11a). The host sees guests + Edit event; the editor opens from here. */
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, showNotice } = useAuth();
  const userId = session?.user.id;

  const [page, setPage] = useState<EventPage | null>(null);
  const [error, setError] = useState<string>();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [social, setSocial] = useState<EventSocial | null>(null);
  const [replying, setReplying] = useState(false);

  // Reload on focus so edits made in the editor show up when coming back.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadEventPage(id, userId)
        .then(setPage)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this event.'));
      loadEventSocial(id).then(setSocial).catch(() => setSocial(null));
    }, [id, userId]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const edit = () => router.push({ pathname: '/events/[id]/edit', params: { id } });
  const openAnswers = () => router.push(rsvpHref(id));

  /** Guest RSVP. Saying yes to an event with questions continues to the host's questionnaire. */
  const respond = async (status: RsvpStatus | null) => {
    const wasGoing = social?.my_status === 'yes';
    setReplying(true);
    try {
      const result = await setRsvp(id, status);
      setSocial(await loadEventSocial(id));
      if (result.waitlisted && !wasGoing) showNotice(`The event is full — you're #${result.waitlist_rank} on the waitlist.`);
      if (status === 'yes' && !wasGoing && social?.has_questions) openAnswers();
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'Could not save your RSVP.');
    } finally {
      setReplying(false);
    }
  };

  if (!page) {
    return (
      <Screen>
        <IconButton icon={<Text variant="heading">‹</Text>} onPress={back} accessibilityLabel="Back" variant="ghost" />
        <Text variant="body" tone={error ? 'danger' : 'muted'}>{error ?? 'Loading…'}</Text>
      </Screen>
    );
  }

  const published = page.status === 'published';
  const when = formatEventWhen(page.dateTime, page.endsAt);
  const directions = directionsUrl(page);
  const share = () =>
    Share.share({ message: `You're invited to ${page.title} on Evident: ${inviteLink(page.inviteCode)}` });

  const goingNames = page.going.slice(0, 2).map((p) => p.name.split(' ')[0]);
  const othersGoing = page.going.length - goingNames.length;
  const guestSummary = [
    `${page.going.length} going`,
    page.pending.length ? `${page.pending.length} pending` : null,
  ].filter(Boolean).join(' · ');
  const guestDetail = page.going.length
    ? `${goingNames.join(', ')}${othersGoing > 0 ? ` + ${othersGoing} more` : ''} going`
    : page.pending.length
      ? 'Waiting on replies'
      : published
        ? 'No one yet — share the invite link'
        : 'Guests show up here once it is published';

  return (
    <Screen
      footer={
        page.isHost ? (
          <>
            <View style={{ flex: 1 }}>
              <Button label="Edit event" onPress={edit} fullWidth />
            </View>
            <IconButton
              icon={<Text variant="heading" tone="accent">↗</Text>}
              onPress={share}
              accessibilityLabel="Invite friends"
              variant="outline"
              disabled={!published}
            />
          </>
        ) : social ? (
          <GuestFooter social={social} busy={replying} onRespond={respond} onOpenAnswers={openAnswers} />
        ) : undefined
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton icon={<Text variant="heading">‹</Text>} onPress={back} accessibilityLabel="Back" variant="ghost" />
        {published && (
          <IconButton icon={<Text variant="heading">↗</Text>} onPress={share} accessibilityLabel="Share" variant="ghost" />
        )}
      </View>

      {!published && (
        <Card tone="sunken">
          <Text variant="body" tone="strong">Draft — only you can see this. Publish it from Edit event.</Text>
        </Card>
      )}

      <Text variant="display" align="center">{page.title}</Text>
      {page.coverUrl && <CoverImage uri={page.coverUrl} accessibilityLabel="Event cover" />}

      <Divider />

      <View style={{ gap: spacing.xs }}>
        <Text variant="eyebrow">When</Text>
        <Text variant="heading">{when.date}</Text>
        {!!when.time && <Text variant="body" tone="muted">{when.time}</Text>}
      </View>

      <Divider />

      <View style={{ gap: spacing.xs }}>
        <Text variant="eyebrow">Where</Text>
        <Text variant="heading">{page.location || 'Place to be confirmed'}</Text>
        <Text variant="body" tone="muted">Hosted by {page.host.name}</Text>
        {directions && (
          <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
            <Button label="Directions" variant="secondary" size="sm" onPress={() => Linking.openURL(directions)} />
          </View>
        )}
      </View>

      {page.isHost && (
        <Card onPress={() => setGuestsOpen(true)} accessibilityLabel={`Guests: ${guestSummary}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {page.going.length > 0 && <AvatarStack people={page.going.map(toStackPerson)} />}
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="label">{guestSummary}</Text>
              <Text variant="small" tone="subtle">{guestDetail}</Text>
            </View>
            <Text variant="heading" tone="subtle">›</Text>
          </View>
        </Card>
      )}

      {!page.isHost && social && (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {social.followed_going.length > 0 && (
              <AvatarStack people={social.followed_going.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url }))} />
            )}
            <Text variant="label" tone="muted">{socialLine(social)}</Text>
          </View>
          <GuestStatus social={social} busy={replying} onRespond={respond} onOpenAnswers={openAnswers} />
        </View>
      )}

      {!!page.notes && (
        <>
          <Divider />
          <View style={{ gap: spacing.sm }}>
            <Text variant="eyebrow">Notes from the host</Text>
            <Text variant="body" tone="strong">{page.notes}</Text>
          </View>
        </>
      )}

      <Dialog
        visible={guestsOpen}
        onClose={() => setGuestsOpen(false)}
        title="Guest list"
        actions={<Button label="Done" onPress={() => setGuestsOpen(false)} fullWidth />}
      >
        <ScrollView style={{ maxHeight: sizes.guestListMax }} contentContainerStyle={{ gap: spacing.lg }}>
          {page.capacity && (
            <Text variant="small" tone="muted">
              {page.going.length} of {page.capacity} spots filled
            </Text>
          )}
          <GuestGroup title="Going" people={page.going} />
          <GuestGroup title="Waitlist" people={page.waitlist} />
          <GuestGroup title="Maybe" people={page.maybe} />
          <GuestGroup title="Invited, no reply yet" people={page.pending} />
          <GuestGroup title="Can't go" people={page.notGoing} />
          {!page.going.length && !page.maybe.length && !page.pending.length && !page.notGoing.length && (
            <Text variant="body" tone="muted">No guests yet. Invite people from Edit event, or share the link.</Text>
          )}
        </ScrollView>
      </Dialog>
    </Screen>
  );
}

function GuestGroup({ title, people }: { title: string; people: Person[] }) {
  if (!people.length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="eyebrow">{`${title} · ${people.length}`}</Text>
      {people.map((p) => (
        <PersonRow key={p.id} name={p.name} avatarUrl={p.avatar_url} subtitle={p.username ? `@${p.username}` : undefined} />
      ))}
    </View>
  );
}

const toStackPerson = (p: Person) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url });

type GuestProps = {
  social: EventSocial;
  busy: boolean;
  onRespond: (status: RsvpStatus | null) => void;
  onOpenAnswers: () => void;
};

/** Pinned RSVP buttons for guests (design 4c): I'm going · Maybe. */
function GuestFooter({ social, busy, onRespond, onOpenAnswers }: GuestProps) {
  const status = social.my_status;
  const waitlisted = status === 'yes' && social.my_waitlist_rank > 0;

  if (!social.rsvp_open && !status) {
    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text variant="label" tone="muted">RSVPs for this event have closed</Text>
      </View>
    );
  }

  if (status === 'yes') {
    return (
      <View style={{ flex: 1 }}>
        <Button
          label={waitlisted ? `Waitlisted · #${social.my_waitlist_rank}` : "You're going ✓"}
          variant="soft"
          onPress={social.has_questions ? onOpenAnswers : () => {}}
          fullWidth
        />
      </View>
    );
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        <Button label="I'm going" onPress={() => onRespond('yes')} loading={busy} disabled={!social.rsvp_open} fullWidth />
      </View>
      <Button
        label="Maybe"
        variant={status === 'maybe' ? 'soft' : 'secondary'}
        onPress={() => onRespond(status === 'maybe' ? null : 'maybe')}
        disabled={busy || !social.rsvp_open}
      />
    </>
  );
}

/** Your current reply on the page, with ways to change it. */
function GuestStatus({ social, busy, onRespond, onOpenAnswers }: GuestProps) {
  const status = social.my_status;
  if (!status) return null;

  const line = {
    yes: social.my_waitlist_rank > 0 ? `You're #${social.my_waitlist_rank} on the waitlist` : "You're going",
    maybe: 'You said maybe',
    no: "You said you can't make it",
  }[status];

  return (
    <Card tone="sunken">
      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">{line}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {status === 'yes' && social.has_questions && (
            <Button label="Your answers" variant="secondary" size="sm" onPress={onOpenAnswers} />
          )}
          {status !== 'no' && (
            <Button label="Can't go" variant="ghost" size="sm" onPress={() => onRespond('no')} disabled={busy} />
          )}
          {status === 'no' && (
            <Button label="Undo" variant="ghost" size="sm" onPress={() => onRespond(null)} disabled={busy} />
          )}
        </View>
      </View>
    </Card>
  );
}
