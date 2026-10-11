import { Pressable, StyleSheet } from 'react-native';

import { colors, opacity, radii, shadows, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
};

/** Small floating pill button (e.g. "↑ Your events") — place it with absolute layout. */
export function FloatingPill({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label.replace('↑', '').trim()}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text variant="buttonSmall" tone="onOverlay">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    boxShadow: shadows.md,
  },
  pressed: { opacity: opacity.pressed },
});
