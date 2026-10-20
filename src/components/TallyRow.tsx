import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  count: number;
  /** Everyone who answered — the bar shows count / total. */
  total: number;
  /** Tap to show who picked it. */
  onPress?: () => void;
  expanded?: boolean;
  /** Shown under the row when expanded (e.g. the people who picked it). */
  children?: ReactNode;
};

/** One answer option with its count and a bar (Responses summary). */
export function TallyRow({ label, count, total, onPress, expanded = false, children }: Props) {
  const share = total ? count / total : 0;
  return (
    <View style={styles.block}>
      <Pressable
        onPress={onPress}
        disabled={!onPress || !count}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${count} of ${total}`}
        accessibilityState={{ expanded }}
        style={styles.stack}
      >
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={2}>{label}</Text>
          </View>
          <Text variant="label" tone={count ? 'default' : 'subtle'}>{count}</Text>
          {!!onPress && !!count && <Text variant="label" tone="subtle">{expanded ? '⌃' : '⌄'}</Text>}
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
      </Pressable>
      {expanded && children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  stack: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  track: { height: sizes.tallyBar, borderRadius: radii.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
});
