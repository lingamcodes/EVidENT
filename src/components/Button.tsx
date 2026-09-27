import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, layout, opacity, radii, spacing, typography } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'outline' | 'danger' | 'dangerSoft';
type Size = 'md' | 'sm' | 'xs';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const labelColors: Record<Variant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.text,
  ghost: colors.accent,
  soft: colors.accentText,
  outline: colors.accentText,
  danger: colors.textOnAccent,
  dangerSoft: colors.danger,
};

const labelTypography = {
  md: typography.button,
  sm: typography.buttonSmall,
  xs: typography.buttonTiny,
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  const labelColor = labelColors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[labelTypography[size], { color: labelColor }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  md: { minHeight: layout.touchTarget, paddingHorizontal: spacing.lg },
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  xs: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md - 1 },
  fullWidth: { alignSelf: 'stretch' },

  primary: { backgroundColor: colors.accent },
  secondary: { borderColor: colors.border },
  ghost: { paddingHorizontal: spacing.xs },
  soft: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
  outline: { borderColor: colors.accent },
  danger: { backgroundColor: colors.danger },
  dangerSoft: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },

  disabled: { opacity: opacity.disabled },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accentPressed },
  secondary: { backgroundColor: colors.pressedTint },
  ghost: { backgroundColor: colors.pressedAccentTint },
  soft: { backgroundColor: colors.accentMuted },
  outline: { backgroundColor: colors.pressedAccentTint },
  danger: { backgroundColor: colors.textStrong },
  dangerSoft: { backgroundColor: colors.dangerBorder },
});
