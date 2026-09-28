import { StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';

type Props = { total: number; current: number };

/** Segmented bar for multi-step flows (onboarding, create event). `current` is 1-based. */
export function StepProgress({ total, current }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.bar, i < current && styles.done]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 1 },
  bar: { flex: 1, height: sizes.progressBar, borderRadius: radii.pill, backgroundColor: colors.track },
  done: { backgroundColor: colors.accent },
});
