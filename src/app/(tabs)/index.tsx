import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

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
  PeekStrip,
  Screen,
  ScrollPanel,
  SectionHeader,
  SlidePager,
  Tabs,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import { loadMyEvents, parseInviteCode, type MyEvent } from '@/lib/events';
import { isUnseen, loadFeed, markSeen, verbText, type FeedItem } from '@/lib/feed';
import { formatLongDate, formatWhen, relativeUntil, timeAgo } from '@/lib/format';
import { loadMyGoing, loadMyInvites, rsvpHref, setRsvp, type GoingEvent, type MyInvite, type RsvpStatus } from '@/lib/rsvp';
import { sizes, spacing } from '@/theme/tokens';

type FeedTab = 'friends' | 'invites';

/** Friends activity shows only the most recent items. */
const FEED_LIMIT = 15;

/**
 * Home (design 6b) as two slides:
 *  1. Your events — greeting, You're going, Your events (cards shrink to fit one
 *     screen), with the Friends | Invites tabs peeking at the bottom.
 *  2. Friends | Invites — fills the screen. Back to slide 1 via the top strip
 *     or by pulling down at the top of the list.
 */
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

  // ── Slide layout (measured, so it fits any phone) ──────────────────────
  const pagerRef = useRef<ScrollView>(null);
  const [viewportH, setViewportH] = useState(0);
  const [tabsH, setTabsH] = useState<number>(sizes.tabsRowHeight);
  const [slide1ContentH, setSlide1ContentH] = useState(0);
  const [cardWidth, setCardWidth] = useState<number>(sizes.eventCard.width);
  const [onSlide2, setOnSlide2] = useState(false);

  const slide1H = Math.max(0, viewportH - tabsH); // the tabs peek below slide 1
  const slide2Top = Math.max(0, slide1H - sizes.peekStrip); // leaves room for the strip on slide 2
  const slide2H = Math.max(0, viewportH - sizes.peekStrip);
  const listH = Math.max(0, slide2H - tabsH);

  // Shrink (or grow back) the carousel cards so slide 1 fits one screen. A section's
  // height changes 1:1 with card width (square photo), so one step converges.
  useEffect(() => {
    if (!slide1H || !slide1ContentH) return;
    const carousels = (going?.length ? 1 : 0) + (hosting?.length ? 1 : 0);
    if (!carousels) return;
    const target = cardWidth - (slide1ContentH - slide1H) / carousels;
    const next = Math.round(Math.min(sizes.eventCard.width, Math.max(sizes.eventCardMinWidth, target)));
    if (Math.abs(next - cardWidth) > 1) setCardWidth(next);
  }, [slide1ContentH, slide1H, going?.length, hosting?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToEvents = () => pagerRef.current?.scrollTo({ y: 0, animated: true });

  // ── Unseen badges (stored on the account) ──────────────────────────────
  const [seenFriendsAt, setSeenFriendsAt] = useState<string | null | undefined>(undefined);
  const [seenInvitesAt, setSeenInvitesAt] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!profile) return;
    setSeenFriendsAt((v) => (v === undefined ? profile.last_seen_friends_at : v));
    setSeenInvitesAt((v) => (v === undefined ? profile.last_seen_invites_at : v));
  }, [profile]);

  const friendsBadge =
    seenFriendsAt === undefined ? 0 : (feed ?? []).filter((f) => isUnseen(f.at, seenFriendsAt)).length;
  const invitesBadge =
    seenInvitesAt === undefined
      ? 0
      : (invites ?? []).filter((i) => i.my_status === null && isUnseen(i.invited_at, seenInvitesAt)).length;

  // Looking at a tab on slide 2 marks it seen.
  useEffect(() => {
    if (!onSlide2 || !userId) return;
    if (tab === 'friends' && friendsBadge) markSeen(userId, 'friends').then(setSeenFriendsAt).catch(() => {});
    if (tab === 'invites' && invitesBadge) markSeen(userId, 'invites').then(setSeenInvitesAt).catch(() => {});
  }, [onSlide2, tab, userId, friendsBadge, invitesBadge]);

  // ── Data ───────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    if (!userId) return;
    loadMyGoing().then(setGoing).catch(() => setGoing([]));
    loadMyEvents(userId).then(setHosting).catch(() => setHosting([]));
    loadFeed(FEED_LIMIT).then(setFeed).catch(() => setFeed([]));
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

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1 }} onLayout={(e) => setViewportH(Math.round(e.nativeEvent.layout.height))}>
        <ScrollView
          ref={pagerRef}
          showsVerticalScrollIndicator={false}
          snapToOffsets={[0, slide2Top]}
          snapToEnd={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => setOnSlide2(e.nativeEvent.contentOffset.y > slide2Top / 2)}
        >
          {/* ── Slide 1: Your events ─────────────────────────────────── */}
          <View style={{ height: slide1H, overflow: 'hidden' }}>
            <View style={{ gap: spacing.xl }} onLayout={(e) => setSlide1ContentH(Math.round(e.nativeEvent.layout.height))}>
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

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="You're going" />
                {going === null && <Text variant="small" tone="muted">Loading…</Text>}
                {going?.length === 0 && (
                  <Card>
                    <Text variant="body" tone="strong">Nothing lined up yet. Check your invites below, or find something in Explore.</Text>
                  </Card>
                )}
                {!!going?.length && (
                  <EventCarousel cardWidth={cardWidth}>
                    {going.map((e) => (
                      <EventCard
                        key={e.event_id}
                        width={cardWidth}
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

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Your events" />
                {hosting === null && <Text variant="small" tone="muted">Loading…</Text>}
                {hosting?.length === 0 && (
                  <Card>
                    <Text variant="body" tone="strong">No events yet. Tap the + below to host one.</Text>
                  </Card>
                )}
                {!!hosting?.length && (
                  <EventCarousel cardWidth={cardWidth}>
                    {hosting.map((e) => (
                      <EventCard
                        key={e.id}
                        width={cardWidth}
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
            </View>
          </View>

          {/* ── Slide 2: Friends | Invites (the tabs peek on slide 1) ─── */}
          <View style={{ height: slide2H }}>
            <View onLayout={(e) => setTabsH(Math.round(e.nativeEvent.layout.height))}>
              <Tabs
                size="lg"
                tabs={[
                  { key: 'friends', label: 'Friends', badge: friendsBadge },
                  { key: 'invites', label: 'Invites', badge: invitesBadge },
                ]}
                value={tab}
                onChange={setTab}
              />
            </View>

            {tab === 'friends' && (
              <ScrollPanel height={listH} onPullBack={goToEvents}>
                {feed === null && <Text variant="small" tone="muted">Loading…</Text>}
                {feed?.length === 0 && (
                  <Text variant="body" tone="muted">When people you follow host or join public events, it shows up here.</Text>
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
              </ScrollPanel>
            )}

            {tab === 'invites' && (
              <View style={{ height: listH, gap: spacing.sm, paddingTop: spacing.sm }}>
                {/* Paste an invite link or code */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      size="sm"
                      value={inviteInput}
                      onChangeText={setInviteInput}
                      placeholder="Got an invite link? Paste it here"
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={inviteError}
                      onSubmitEditing={openInvite}
                      returnKeyType="go"
                    />
                  </View>
                  <Button label="Open" variant="secondary" size="sm" onPress={openInvite} disabled={!inviteInput.trim()} />
                </View>

                {shownInvites === null && <Text variant="small" tone="muted">Loading…</Text>}
                {shownInvites?.length === 0 && <Text variant="body" tone="muted">No invites waiting for a reply.</Text>}
                {!!shownInvites?.length && (
                  <SlidePager height="content" onPullBack={goToEvents}>
                    {shownInvites.map((i) => (
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
                  </SlidePager>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Back to slide 1 — only while on slide 2, never over the tabs or list rows. */}
        {onSlide2 && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <PeekStrip label={`Your events · ${going?.length ?? 0} upcoming`} onPress={goToEvents} />
          </View>
        )}
      </View>
    </Screen>
  );
}
