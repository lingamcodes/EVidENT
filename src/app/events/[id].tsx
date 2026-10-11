import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';

import {
  ActionTile,
  Avatar,
  AvatarStack,
  Button,
  Card,
  CoverImage,
  Dialog,
  Divider,
  DropdownMenu,
  Icon,
  IconButton,
  InvitedBox,
  InviteFriendsDialog,
  ParticipantGrid,
  PersonRow,
  Screen,
  Text,
  type MenuAnchor,
} from '@/components';
import { useAuth } from '@/lib/auth';
import {
  directionsUrl,
  inviteLink,
  inviteToEvent,
  loadEventPage,
  loadFriends,
  loadMySentInvites,
  type EventPage,
  type Person,
} from '@/lib/events';
import { formatEventWhen } from '@/lib/format';
import { loadEventSocial, loadParticipants, rsvpHref, setRsvp, socialLine, type EventSocial, type FriendGoing, type RsvpStatus } from '@/lib/rsvp';
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
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Everyone going — only filled in once you're going yourself.
  const [participants, setParticipants] = useState<FriendGoing[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sentInvites, setSentInvites] = useState<Person[]>([]);
  // Who you follow (individuals) — they come right after you in the participants row.
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

  // Reload on focus so edits made in the editor show up when coming back.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadEventPage(id, userId)
        .then(setPage)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this event.'));
      loadEventSocial(id).then(setSocial).catch(() => setSocial(null));
      loadParticipants(id).then(setParticipants).catch(() => setParticipants([]));
      loadMySentInvites(id, userId).then(setSentInvites).catch(() => setSentInvites([]));
      loadFriends(userId)
        .then((list) => setFriendIds(new Set(list.map((p) => p.id))))
        .catch(() => {});
    }, [id, userId]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const edit = () => router.push({ pathname: '/events/[id]/edit', params: { id } });
  const openAnswers = () => router.push(rsvpHref(id));

  /** Guest RSVP. "I'm going" on an event with questions opens the questionnaire instead. */
  const respond = async (status: RsvpStatus | null) => {
    const wasGoing = social?.my_status === 'yes';
    // With a questionnaire you're only going once the answers are submitted.
    if (status === 'yes' && !wasGoing && social?.has_questions) {
      openAnswers();
      return;
    }
    setReplying(true);
    try {
      const result = await setRsvp(id, status);
      setSocial(await loadEventSocial(id));
      loadParticipants(id).then(setParticipants).catch(() => setParticipants([]));
      if (result.waitlisted && !wasGoing) showNotice(`The event is full — you're #${result.waitlist_rank} on the waitlist.`);
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

  // Guests who are going can invite friends to public events, or to private ones the host opened up.
  const canInvite = published && (page.visibility === 'public' || page.allowGuestInvites);
  const openInvites = () => setInviteOpen(true);
  const spotsLeft = page.capacity === null ? null : Math.max(0, page.capacity - (social?.going_count ?? 0));
  const capacityLine =
    spotsLeft === null
      ? 'No Limit'
      : `Max ${page.capacity} people · ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left. Anyone past that joins the waitlist.`;
  const locked: Record<string, string> = {
    ...Object.fromEntries(sentInvites.map((p) => [p.id, 'Invited'])),
    ...Object.fromEntries(participants.map((p) => [p.id, 'Going'])),
  };

  // Participants row: [Invite + people you invited] · You · friends · everyone else. People you
  // invited sit in the box (greyed until they're going), not again in the row.
  const goingIds = new Set(participants.map((p) => p.id));
  const invitedIds = new Set(sentInvites.map((p) => p.id));
  const others = participants.filter((p) => p.id !== userId && !invitedIds.has(p.id));
  const orderedParticipants = [
    ...participants.filter((p) => p.id === userId),
    ...others.filter((p) => friendIds.has(p.id)),
    ...others.filter((p) => !friendIds.has(p.id)),
  ].map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url }));

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
              icon={<Icon name={{ ios: 'square.and.arrow.up', android: 'share' }} tone="accent" />}
              onPress={share}
              accessibilityLabel="Invite friends"
              variant="outline"
              disabled={!published}
            />
          </>
        ) : social ? (
          <GuestFooter
            social={social}
            busy={replying}
            onRespond={respond}
            onOpenAnswers={openAnswers}
            onLeave={() => setConfirmLeave(true)}
          />
        ) : undefined
      }
    >
      <View style={{ flexDirection: 'row' }}>
        <IconButton icon={<Text variant="heading">‹</Text>} onPress={back} accessibilityLabel="Back" variant="ghost" />
      </View>

      {!published && (
        <Card tone="sunken">
          <Text variant="body" tone="strong">Draft — only you can see this. Publish it from Edit event.</Text>
        </Card>
      )}

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Text variant="display" align="center">{page.title}</Text>
        {/* Who's running it, prominently — guests may invite people, but it's the host's event. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={page.host.name} uri={page.host.avatar_url} size="xs" />
          <Text variant="bodyStrong">By {page.host.name}</Text>
        </View>
      </View>
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
          {participants.length > 0 ? (
            // You're going: see everyone who's going.
            <View style={{ gap: spacing.md }}>
              <Text variant="eyebrow">{`Going · ${participants.length}`}</Text>
              <ParticipantGrid
                people={orderedParticipants}
                meId={userId}
                leading={
                  <InvitedBox
                    people={sentInvites.map((p) => ({
                      id: p.id,
                      name: p.name,
                      avatarUrl: p.avatar_url,
                      dimmed: !goingIds.has(p.id),
                    }))}
                    inviteButton={
                      canInvite && (
                        <ActionTile
                          label="Invite"
                          button={
                            <IconButton
                              icon={<Icon name={{ ios: 'person.badge.plus', android: 'person_add' }} tone="accent" />}
                              onPress={openInvites}
                              accessibilityLabel="Invite friends"
                              variant="outline"
                            />
                          }
                        />
                      )
                    }
                  />
                }
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {social.followed_going.length > 0 && (
                <AvatarStack people={social.followed_going.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url }))} />
              )}
              <Text variant="label" tone="muted">{socialLine(social)}</Text>
            </View>
          )}
          <GuestStatus social={social} busy={replying} onRespond={respond} />
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

      <InviteFriendsDialog
        visible={inviteOpen}
        userId={userId}
        selected={[]}
        intro={capacityLine}
        locked={locked}
        onClose={() => setInviteOpen(false)}
        onDone={async (people) => {
          setInviteOpen(false);
          const ids = people.map((p) => p.id).filter((pid) => !locked[pid]);
          if (!ids.length || !userId) return;
          try {
            await inviteToEvent(id, userId, ids);
            loadMySentInvites(id, userId).then(setSentInvites).catch(() => {});
            showNotice(`Invited ${ids.length} ${ids.length === 1 ? 'person' : 'people'}.`);
          } catch (e) {
            showNotice(e instanceof Error ? e.message : 'Could not send the invites.');
          }
        }}
      />

      <Dialog
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave this event?"
        message={
          social?.waitlist_count
            ? 'Your spot goes to the next person on the waitlist.'
            : "The host will see that you can't make it."
        }
        actions={
          <>
            <Button label="Stay" variant="secondary" size="sm" onPress={() => setConfirmLeave(false)} />
            <Button
              label="Leave event"
              variant="danger"
              size="sm"
              onPress={async () => {
                setConfirmLeave(false);
                await respond('no');
                showNotice(`You left ${page.title}.`);
              }}
            />
          </>
        }
      />

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

/** Pinned button for guests (design 4c): I'm going, or You're going (menu). */
function GuestFooter({ social, busy, onRespond, onOpenAnswers, onLeave }: GuestProps & { onLeave: () => void }) {
  const status = social.my_status;
  const waitlisted = status === 'yes' && social.my_waitlist_rank > 0;

  if (!social.rsvp_open && status !== 'yes') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="label" tone="muted" align="center">RSVPs for this event have closed</Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        {status === 'yes' ? (
          <GoingButton
            label={waitlisted ? `Waitlisted · #${social.my_waitlist_rank}` : "You're going"}
            hasQuestions={social.has_questions}
            busy={busy}
            onOpenAnswers={onOpenAnswers}
            onLeave={onLeave}
          />
        ) : (
          <Button label="I'm going" onPress={() => onRespond('yes')} loading={busy} fullWidth />
        )}
      </View>
    </>
  );
}

/** "You're going": darkens the screen and offers Leave event · Edit response · Cancel. */
function GoingButton({
  label,
  hasQuestions,
  busy,
  onOpenAnswers,
  onLeave,
}: {
  label: string;
  hasQuestions: boolean;
  busy: boolean;
  onOpenAnswers: () => void;
  onLeave: () => void;
}) {
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [open, setOpen] = useState(false);

  const openMenu = () =>
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });

  return (
    <View ref={anchorRef} collapsable={false}>
      <Button label={label} variant="soft" onPress={openMenu} disabled={busy} fullWidth />
      <DropdownMenu
        visible={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        direction="up"
        items={[
          { label: 'Leave event', onPress: onLeave, tone: 'danger' },
          // Greyed out when the event has no questionnaire (nothing to edit).
          { label: 'Edit response', onPress: onOpenAnswers, disabled: !hasQuestions },
          { label: 'Cancel', onPress: () => {} },
        ]}
      />
    </View>
  );
}

/** Your current reply on the page, with ways to change it. */
function GuestStatus({ social, busy, onRespond }: Omit<GuestProps, 'onOpenAnswers'>) {
  const status = social.my_status;
  // Going: the footer's "You're going" menu covers editing answers and leaving.
  if (!status || status === 'yes') return null;

  const line = {
    maybe: 'You said maybe',
    no: 'You left this event',
  }[status];

  return (
    <Card tone="sunken">
      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">{line}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {status === 'no' && (
            <Button label="Undo" variant="ghost" size="sm" onPress={() => onRespond(null)} disabled={busy} />
          )}
        </View>
      </View>
    </Card>
  );
}
