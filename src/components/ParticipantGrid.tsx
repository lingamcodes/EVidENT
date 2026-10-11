import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Person = { id: string; name: string; avatarUrl?: string | null };

type Props = {
  people: Person[];
  /** Shown as "You" instead of their name. */
  meId?: string;
  /** An extra tile after everyone (e.g. an "Invite" button), with its caption. */
  trailing?: { node: ReactNode; label: string };
};

/** Everyone going, spread out: a face with the first name underneath. */
export function ParticipantGrid({ people, meId, trailing }: Props) {
  return (
    <View style={styles.grid}>
      {people.map((p) => (
        <View key={p.id} style={styles.tile}>
          <Avatar name={p.name} uri={p.avatarUrl} size="md" />
          <Text variant="small" tone="strong" align="center" numberOfLines={1}>
            {p.id === meId ? 'You' : p.name.split(' ')[0]}
          </Text>
        </View>
      ))}
      {trailing && (
        <View style={styles.tile}>
          <View style={styles.trailingSlot}>{trailing.node}</View>
          <Text variant="small" tone="accent" align="center" numberOfLines={1}>{trailing.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.md },
  tile: { width: sizes.participantTile, alignItems: 'center', gap: spacing.xs },
  // Same height as a face, so the captions line up.
  trailingSlot: { height: sizes.avatar.md, justifyContent: 'center' },
});
