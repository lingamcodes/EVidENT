import { Pressable, StyleSheet } from 'react-native';

import { borders, colors, sizes, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
};

/** Thin full-width bar ("⌃ Your events · 3 upcoming") that jumps back to the section above. */
export function PeekStrip({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
    >
      <Text variant="label" tone="muted">⌃  {label}</Text>
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
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
});
