import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
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
import {
  addSeenKeys,
  advanceSeen,
  feedKey,
  isUnseen,
  loadFeed,
  loadSeenKeys,
  verbText,
  type FeedItem,
  type SeenKind,
} from '@/lib/feed';
import { formatLongDate, formatWhen, relativeUntil, timeAgo } from '@/lib/format';
import { loadMyGoing, loadMyInvites, rsvpHref, setRsvp, type FriendGoing, type GoingEvent, type MyInvite, type RsvpStatus } from '@/lib/rsvp';
import { sizes, spacing } from '@/theme/tokens';

type FeedTab = 'friends' | 'invites';

const toFace = (p: FriendGoing) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url });

/** Friends activity shows only the most recent items. */
const FEED_LIMIT = 15;

/**
 * Home (design 6b) as two slides:
 *  1. Your events — greeting, You're going, Your events (cards shrink to fit one
 *     screen), with a "See Friends · Invites" strip at the bottom.
 *  2. Friends | Invites — fills the screen. Back to slide 1 via the top strip
 *     or by pulling down at the top of the list.
 * Red badges count unseen items and go down one by one as each is viewed.
 */
export default function HomeScreen() {
  const { session, profile, refreshProfile, pendingInvite, clearPendingInvite, showNotice } = useAuth();
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
  const pagerRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewportH, setViewportH] = useState(0);
  const [tabsH, setTabsH] = useState<number>(sizes.tabsRowHeight);
  const [slide1ContentH, setSlide1ContentH] = useState(0);
  const [cardWidth, setCardWidth] = useState<number>(sizes.eventCard.width);
  const [onSlide2, setOnSlide2] = useState(false); // past halfway: show the top strip
  const [atSlide2, setAtSlide2] = useState(false); // settled on slide 2: items count as viewed

  // Slide 1 fills the screen and ends with the "See Friends · Invites" strip; on
  // slide 2 that spot is covered by the "Your events" strip at the top.
  const slide1H = viewportH;
  const slide1BodyH = Math.max(0, viewportH - sizes.peekStrip);
  const slide2Top = Math.max(0, viewportH - sizes.peekStrip);
  const slide2H = Math.max(0, viewportH - sizes.peekStrip);
  const listH = Math.max(0, slide2H - tabsH);

  // Shrink (or grow back) the carousel cards so slide 1 fits one screen. A section's
  // height changes 1:1 with card width (square photo), so one step converges.
  useEffect(() => {
    if (!slide1BodyH || !slide1ContentH) return;
    const carousels = (going?.length ? 1 : 0) + (hosting?.length ? 1 : 0);
    if (!carousels) return;
    const target = cardWidth - (slide1ContentH - slide1BodyH) / carousels;
    const next = Math.round(Math.min(sizes.eventCard.width, Math.max(sizes.eventCardMinWidth, target)));
    if (Math.abs(next - cardWidth) > 1) setCardWidth(next);
  }, [slide1ContentH, slide1BodyH, going?.length, hosting?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToEvents = () => pagerRef.current?.scrollTo({ y: 0, animated: true });
  const goToFeed = () => pagerRef.current?.scrollTo({ y: slide2Top, animated: true });

  // ── Unseen badges (stored on the account, counted down item by item) ─
  const [seenFriendsAt, setSeenFriendsAt] = useState<string | null | undefined>(undefined);
  const [seenInvitesAt, setSeenInvitesAt] = useState<string | null | undefined>(undefined);
  const [seenKeys, setSeenKeys] = useState<Record<SeenKind, Set<string>> | null>(null);
  useEffect(() => {
    if (!profile) return;
    setSeenFriendsAt((v) => (v === undefined ? profile.last_seen_friends_at : v));
    setSeenInvitesAt((v) => (v === undefined ? profile.last_seen_invites_at : v));
  }, [profile]);

  const ready = !!seenKeys && seenFriendsAt !== undefined && seenInvitesAt !== undefined;
  const unseenFeed = ready
    ? (feed ?? []).filter((f) => isUnseen(f.at, seenFriendsAt) && !seenKeys.friends.has(feedKey(f))).map(feedKey)
    : [];
  const unseenInvites = ready
    ? (invites ?? [])
        .filter((i) => i.my_status === null && isUnseen(i.invited_at, seenInvitesAt) && !seenKeys.invites.has(i.event_id))
        .map((i) => i.event_id)
    : [];
  const friendsBadge = unseenFeed.length;
  const invitesBadge = unseenInvites.length;

  /** Items scrolled into view count as seen; once the last one is seen, the watermark moves up. */
  const markViewed = (kind: SeenKind, keys: string[]) => {
    if (!userId || !ready) return;
    const unseen = kind === 'friends' ? unseenFeed : unseenInvites;
    const fresh = keys.filter((k) => unseen.includes(k));
    if (!fresh.length) return;
    if (fresh.length === unseen.length) {
      // Watermark = the newest item's own timestamp string (exact, so it compares equal).
      const times = kind === 'friends' ? (feed ?? []).map((f) => f.at) : (invites ?? []).map((i) => i.invited_at);
      const upTo = times.reduce((a, b) => (new Date(b).getTime() > new Date(a).getTime() ? b : a));
      if (kind === 'friends') setSeenFriendsAt(upTo);
      else setSeenInvitesAt(upTo);
      setSeenKeys((prev) => prev && { ...prev, [kind]: new Set<string>() });
      advanceSeen(userId, kind, upTo).then(refreshProfile).catch(() => {});
    } else {
      setSeenKeys((prev) => prev && { ...prev, [kind]: new Set([...prev[kind], ...fresh]) });
      addSeenKeys(kind, fresh).catch(() => {});
    }
  };

  // Friends rows: where each sits in the list, to tell which are on screen.
  const rowLayouts = useRef(new Map<string, { y: number; h: number }>());
  const friendsScrollY = useRef(0);
  const viewFriends = () => {
    if (!atSlide2 || tab !== 'friends' || !listH) return;
    const top = friendsScrollY.current;
    const visible: string[] = [];
    rowLayouts.current.forEach(({ y, h }, key) => {
      const middle = y + h / 2;
      if (middle >= top && middle <= top + listH) visible.push(key);
    });
    markViewed('friends', visible);
  };
  // Invites: the slide on screen.
  const [inviteIndex, setInviteIndex] = useState(0);

  // ── Data ───────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    if (!userId) return;
    loadMyGoing().then(setGoing).catch(() => setGoing([]));
    loadMyEvents(userId).then(setHosting).catch(() => setHosting([]));
    loadFeed(FEED_LIMIT).then(setFeed).catch(() => setFeed([]));
    loadMyInvites().then(setInvites).catch(() => setInvites([]));
    Promise.all([loadSeenKeys('friends'), loadSeenKeys('invites')])
      .then(([friends, invitesSeen]) => setSeenKeys({ friends, invites: invitesSeen }))
      .catch(() => setSeenKeys({ friends: new Set(), invites: new Set() }));
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

  // Count what's on screen as viewed. Runs after every render; it's a no-op once
  // nothing new is on screen.
  const onScreenInvite = atSlide2 && tab === 'invites' ? shownInvites?.[inviteIndex]?.event_id : undefined;
  useEffect(() => {
    viewFriends();
    if (onScreenInvite) markViewed('invites', [onScreenInvite]);
  });

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
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            setOnSlide2(y > slide2Top / 2);
            setAtSlide2(slide2Top > 0 && y >= slide2Top - 2);
          }}
        >
          {/* ── Slide 1: Your events ─────────────────────────────────── */}
          <View style={{ height: slide1H }}>
            <View style={{ height: slide1BodyH, overflow: 'hidden' }}>
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
                        friends={e.friends_going_people.map(toFace)}
                        friendsCount={e.friends_going}
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
            <PeekStrip direction="down" label="See Friends · Invites" badge={friendsBadge + invitesBadge} onPress={goToFeed} />
          </View>

          {/* ── Slide 2: Friends | Invites ─────────────────────────────── */}
          <View style={{ height: slide2H }}>
            <View onLayout={(e) => setTabsH(Math.round(e.nativeEvent.layout.height))}>
              <Tabs
                size="lg"
                tabs={[
                  { key: 'friends', label: 'Friends', badge: friendsBadge },
                  { key: 'invites', label: 'Invites', badge: invitesBadge },
                ]}
                value={tab}
                onChange={(next) => {
                  setTab(next);
                  setInviteIndex(0);
                }}
              />
            </View>

            {tab === 'friends' && (
              <ScrollPanel
                height={listH}
                onPullBack={goToEvents}
                onScrollY={(y) => {
                  friendsScrollY.current = y;
                  viewFriends();
                }}
              >
                {feed === null && <Text variant="small" tone="muted">Loading…</Text>}
                {feed?.length === 0 && (
                  <Text variant="body" tone="muted">When people you follow host or join public events, it shows up here.</Text>
                )}
                {feed?.map((item) => {
                  const key = feedKey(item);
                  return (
                    <View
                      key={key}
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        rowLayouts.current.set(key, { y, h: height });
                      }}
                    >
                      <ActivityRow
                        time={timeAgo(item.at)}
                        thumbUrl={item.thumb}
                        thumbShape={item.verb === 'followed' ? 'circle' : 'rounded'}
                        onPress={item.event_id ? () => openEvent(item.event_id!) : undefined}
                      >
                        <Bold>{item.actor_name}</Bold> {verbText[item.verb]} <Bold>{item.target}</Bold>
                      </ActivityRow>
                    </View>
                  );
                })}
              </ScrollPanel>
            )}

            {tab === 'invites' && (
              <View style={{ height: listH, gap: spacing.sm, paddingTop: spacing.sm }}>
                {/* Paste an invite link or code */}
                <View style={{ gap: spacing.xs }}>
                  <Input
                    value={inviteInput}
                    onChangeText={setInviteInput}
                    placeholder="Got an invite link? Paste it here"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={inviteError}
                    onSubmitEditing={openInvite}
                    returnKeyType="go"
                  />
                  {!!inviteInput.trim() && <Button label="Open invite" variant="secondary" size="sm" onPress={openInvite} fullWidth />}
                </View>

                {shownInvites === null && <Text variant="small" tone="muted">Loading…</Text>}
                {shownInvites?.length === 0 && <Text variant="body" tone="muted">No invites waiting for a reply.</Text>}
                {!!shownInvites?.length && (
                  <SlidePager height="content" onPullBack={goToEvents} onIndexChange={setInviteIndex}>
                    {shownInvites.map((i) => (
                      <InviteCard
                        key={i.event_id}
                        inviterName={i.inviter_name}
                        inviterAvatarUrl={i.inviter_avatar_url}
                        title={i.title}
                        coverUrl={i.cover_image}
                        friendsGoing={i.friends_going_people.map(toFace)}
                        friendsGoingCount={i.friends_going}
                        when={formatWhen(i.date_time)}
                        where={i.location}
                        rsvpBy={i.rsvp_by}
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
