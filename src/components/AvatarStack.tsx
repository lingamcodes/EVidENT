import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Person = { id: string; name: string; avatarUrl?: string | null };

type Props = {
  people: Person[];
  max?: number;
  label?: string;
};

/** Overlapping faces + a line like "Rachel and 12 others you follow". */
export function AvatarStack({ people, max = 3, label }: Props) {
  const shown = people.slice(0, max);
  const overlap = -sizes.avatar.sm / 3;

  return (
    <View style={styles.row}>
      <View style={styles.faces}>
        {shown.map((p, i) => (
          <View key={p.id} style={i > 0 && { marginLeft: overlap }}>
            <Avatar name={p.name} uri={p.avatarUrl} size="sm" ringed />
          </View>
        ))}
      </View>
      {label && <Text variant="small" tone="muted">{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  faces: { flexDirection: 'row' },
});
