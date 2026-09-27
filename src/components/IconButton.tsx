import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, opacity, radii, sizes, spacing } from '@/theme/tokens';

type Variant = 'surface' | 'ghost' | 'overlay' | 'outline' | 'bordered';

type Props = {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: Variant;
  size?: 'md' | 'sm' | 'xs';
  /** Toggle buttons (e.g. question photo): accent border + soft fill when on. */
  selected?: boolean;
  showBadge?: boolean;
  disabled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 'md',
  selected = false,
  showBadge = false,
  disabled = false,
}: Props) {
  const dimension = dimensions[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={(sizes.iconButton - dimension) / 2 + spacing.xs}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension },
        styles[variant],
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      {showBadge && <View style={styles.badge} />}
    </Pressable>
  );
}

const dimensions = {
  md: sizes.iconButton,
  sm: sizes.iconButtonSmall,
  xs: sizes.iconButtonTiny,
} as const;

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  surface: { backgroundColor: colors.surface },
  ghost: { backgroundColor: 'transparent' },
  overlay: { backgroundColor: colors.overlay },
  outline: { borderWidth: borders.hairline, borderColor: colors.accent },
  bordered: { borderWidth: borders.hairline, borderColor: colors.border },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pressed: { backgroundColor: colors.pressedTint },
  disabled: { opacity: opacity.disabled },
  badge: {
    position: 'absolute',
    top: spacing.xs + 1,
    right: spacing.xs + 2,
    width: sizes.badgeDot + borders.thick * 2,
    height: sizes.badgeDot + borders.thick * 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    borderWidth: borders.thick,
    borderColor: colors.surface,
  },
});
