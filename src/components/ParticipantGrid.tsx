import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Person = { id: string; name: string; avatarUrl?: string | null };

type Props = {
  people: Person[];
  /** Shown as "You" instead of their name. */
  meId?: string;
};

/** Everyone going, spread out: a face with the first name underneath. */
export function ParticipantGrid({ people, meId }: Props) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.md },
  tile: { width: sizes.participantTile, alignItems: 'center', gap: spacing.xs },
});
