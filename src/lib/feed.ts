import { supabase } from './supabase';

export type FeedItem = {
  at: string;
  verb: 'going' | 'hosting' | 'followed';
  event_id: string | null;
  /** Event title, or the followed person's name. */
  target: string;
  /** Event cover, or the followed person's avatar. */
  thumb: string | null;
  target_user_id: string | null;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
};

export const verbText: Record<FeedItem['verb'], string> = {
  going: 'is going to',
  hosting: 'is hosting',
  followed: 'followed',
};

/**
 * What people you follow are up to. "Going" covers public events only; private
 * events never appear unless you can see them yourself (enforced in the database).
 */
export async function loadFeed(limit = 30): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_home_feed', { p_limit: limit });
  if (error) throw error;
  return (data as unknown as FeedItem[]) ?? [];
}

/* ── Home's red badges ───────────────────────────────────────────────
 * An item is unseen if it's newer than the tab's watermark (on the account) and
 * not in seen_items. Looking at an item adds it to seen_items, so the count goes
 * down one by one; once everything is seen the watermark moves up and the list
 * is cleared. */

export type SeenKind = 'friends' | 'invites';

/** Stable id for a feed item (it has no row of its own). */
export const feedKey = (f: FeedItem) => `${f.verb}:${f.actor_id}:${f.event_id ?? f.target_user_id}:${f.at}`;

export async function loadSeenKeys(kind: SeenKind): Promise<Set<string>> {
  const { data, error } = await supabase.from('seen_items').select('item_key').eq('kind', kind);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.item_key));
}

export async function addSeenKeys(kind: SeenKind, keys: string[]) {
  if (!keys.length) return;
  await supabase
    .from('seen_items')
    .upsert(keys.map((item_key) => ({ kind, item_key })), { onConflict: 'user_id,kind,item_key', ignoreDuplicates: true });
}

/** Everything up to `upTo` has been seen: move the watermark there and clear the list. */
export async function advanceSeen(userId: string, kind: SeenKind, upTo: string) {
  const patch = kind === 'friends' ? { last_seen_friends_at: upTo } : { last_seen_invites_at: upTo };
  await supabase.from('users').update(patch).eq('id', userId);
  await supabase.from('seen_items').delete().eq('kind', kind);
}

/** True if `at` is newer than the watermark (never seen = everything is new). */
export const isUnseen = (at: string, seenAt: string | null | undefined) =>
  !seenAt || new Date(at).getTime() > new Date(seenAt).getTime();
