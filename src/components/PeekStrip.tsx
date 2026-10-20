import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, sizes, spacing } from '@/theme/tokens';
import { CountBadge } from './CountBadge';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  /** 'up' = back to the section above (sits at the top); 'down' = on to the section below (sits at the bottom). */
  direction?: 'up' | 'down';
  /** Red count of unseen items in the section it leads to. */
  badge?: number;
};

/** Thin full-width bar ("⌃ Your events · 3 upcoming" / "⌄ See Friends · Invites") that jumps between sections. */
export function PeekStrip({ label, onPress, direction = 'up', badge = 0 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      style={({ pressed }) => [styles.strip, direction === 'up' ? styles.up : styles.down, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text variant="label" tone="muted">{`${direction === 'up' ? '⌃' : '⌄'}  ${label}`}</Text>
        <CountBadge count={badge} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: sizes.peekStrip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  up: { borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  down: { borderTopWidth: borders.hairline, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 1 },
  pressed: { backgroundColor: colors.surfaceSunken },
});
