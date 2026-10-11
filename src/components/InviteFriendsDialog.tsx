import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { loadFriends, type Person } from '@/lib/events';
import { opacity, sizes, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { ChoiceMarker } from './ChoiceMarker';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { PersonRow } from './PersonRow';
import { Text } from './Text';

type Props = {
  visible: boolean;
  userId?: string;
  /** Already ticked when the popup opens (can be unticked). */
  selected: Person[];
  onDone: (people: Person[]) => void;
  onClose: () => void;
  /** A line above the search bar (e.g. how many spots are left). */
  intro?: string;
  /** People who can't be changed here, with why (e.g. "Going", "Invited"): shown ticked and greyed. */
  locked?: Record<string, string>;
};

/** "Invite friends": search the people you follow and tick who to invite. */
export function InviteFriendsDialog({ visible, userId, selected, onDone, onClose, intro, locked = {} }: Props) {
  const [following, setFollowing] = useState<Person[] | null>(null);
  const [picked, setPicked] = useState<Person[]>(selected);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPicked(selected);
    setQuery('');
    if (userId && following === null) loadFriends(userId).then(setFollowing).catch(() => setFollowing([]));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const shown = (following ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q),
  );
  const isPicked = (id: string) => picked.some((p) => p.id === id);
  const toggle = (p: Person) => setPicked(isPicked(p.id) ? picked.filter((x) => x.id !== p.id) : [...picked, p]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Invite friends"
      message={intro}
      actions={<Button label={picked.length ? `Done · ${picked.length}` : 'Done'} onPress={() => onDone(picked)} fullWidth />}
    >
      <Input size="sm" value={query} onChangeText={setQuery} placeholder="Search people you follow" autoCapitalize="none" />
      <ScrollView style={styles.list} contentContainerStyle={styles.stack}>
        {following === null && <Text variant="small" tone="muted">Loading…</Text>}
        {following?.length === 0 && <Text variant="small" tone="muted">You don't follow anyone yet.</Text>}
        {shown.map((p) => {
          const lockedAs = locked[p.id];
          return (
            <Pressable
              key={p.id}
              onPress={() => toggle(p)}
              disabled={!!lockedAs}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!lockedAs || isPicked(p.id), disabled: !!lockedAs }}
              style={lockedAs ? styles.locked : undefined}
            >
              <PersonRow
                name={p.name}
                avatarUrl={p.avatar_url}
                subtitle={lockedAs ?? (p.username ? `@${p.username}` : undefined)}
                action={<ChoiceMarker shape="checkbox" checked={!!lockedAs || isPicked(p.id)} />}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: sizes.dialogListMax },
  stack: { gap: spacing.sm },
  locked: { opacity: opacity.dimmed },
});
