import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Props = {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  /** Usually a small Button, e.g. Follow / Following. */
  action?: ReactNode;
};

/** Avatar + name + subtitle + trailing action — follow suggestions, guest lists, search. */
export function PersonRow({ name, subtitle, avatarUrl, action }: Props) {
  return (
    <View style={styles.row}>
      <Avatar name={name} uri={avatarUrl} size="md" />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
        {subtitle && <Text variant="caption" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
});
