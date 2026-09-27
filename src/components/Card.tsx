import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md';
  tone?: 'surface' | 'sunken';
  accessibilityLabel?: string;
};

export function Card({ children, onPress, padding = 'md', tone = 'surface', accessibilityLabel }: Props) {
  const base = [styles.card, styles[padding], tone === 'sunken' && styles.sunken];
  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  none: { padding: 0 },
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.md + 2 },
  sunken: { backgroundColor: colors.surfaceSunken },
  pressed: { backgroundColor: colors.surfaceSunken },
});
