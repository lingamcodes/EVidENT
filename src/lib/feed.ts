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
