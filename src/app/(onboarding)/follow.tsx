import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton, PersonRow, Screen, StepProgress, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

type Org = { id: string; name: string; username: string | null; avatar_url: string | null; bio: string | null };

/** Onboarding 3 of 3 (design 10c, orgs only): follow a few clubs so Home isn't empty. */
export default function FollowStep() {
  const { session, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase
        .from('users')
        .select('id, name, username, avatar_url, bio')
        .eq('account_type', 'org')
        .neq('id', userId)
        .not('onboarded_at', 'is', null)
        .order('name')
        .limit(50),
      supabase.from('follows').select('target_id').eq('follower_id', userId),
    ]).then(([orgResult, followResult]) => {
      setOrgs(orgResult.data ?? []);
      setFollowing(new Set((followResult.data ?? []).map((f) => f.target_id)));
    });
  }, [userId]);

  const toggle = async (orgId: string) => {
    if (!userId) return;
    setPending(orgId);
    setError(undefined);
    const isFollowing = following.has(orgId);
    const { error: writeError } = isFollowing
      ? await supabase.from('follows').delete().eq('follower_id', userId).eq('target_id', orgId)
      : await supabase.from('follows').insert({ follower_id: userId, target_id: orgId });
    setPending(null);
    if (writeError) return setError(writeError.message);

    const next = new Set(following);
    if (isFollowing) next.delete(orgId);
    else next.add(orgId);
    setFollowing(next);
  };

  // Marking onboarding done flips the root navigator over to the app.
  const finish = async () => {
    if (!userId) return;
    setFinishing(true);
    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) {
      setFinishing(false);
      return setError(updateError.message);
    }
    await refreshProfile();
  };

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />
      <StepProgress total={3} current={3} />
      <View style={{ gap: spacing.xs }}>
        <Text variant="eyebrow">Step 3 of 3</Text>
        <Text variant="title">Follow a few clubs</Text>
        <Text variant="body" tone="muted">Their events show up on your home feed.</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        {orgs === null && <Text variant="small" tone="muted">Loading clubs…</Text>}
        {orgs?.length === 0 && (
          <Text variant="body" tone="muted">No clubs on Evident yet. You can follow them later from their profiles.</Text>
        )}
        {orgs?.map((org) => {
          const isFollowing = following.has(org.id);
          return (
            <PersonRow
              key={org.id}
              name={org.name}
              avatarUrl={org.avatar_url}
              subtitle={org.bio ?? (org.username ? `@${org.username}` : undefined)}
              action={
                <Button
                  label={isFollowing ? 'Following' : 'Follow'}
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="sm"
                  loading={pending === org.id}
                  onPress={() => toggle(org.id)}
                />
              }
            />
          );
        })}
      </View>

      {error && <Text variant="small" tone="danger">{error}</Text>}
      <Button label="Start exploring" onPress={finish} loading={finishing} fullWidth />
      {following.size === 0 && <Button label="Skip for now" variant="ghost" onPress={finish} />}
    </Screen>
  );
}
