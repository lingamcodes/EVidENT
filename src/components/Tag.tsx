import { StyleSheet, Text, View } from 'react-native';

import { borders, colors, radii, spacing, typography } from '@/theme/tokens';

type Variant = 'accent' | 'secondary' | 'neutral' | 'outline' | 'overlay';

type Props = {
  label: string;
  variant?: Variant;
};

const labelColors: Record<Variant, string> = {
  accent: colors.accentStrongText,
  secondary: colors.secondaryText,
  neutral: colors.textStrong,
  outline: colors.accent,
  overlay: colors.textOnOverlay,
};

export function Tag({ label, variant = 'neutral' }: Props) {
  return (
    <View style={[styles.base, styles[variant]]}>
      <Text style={[typography.badge, { color: labelColors[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radii.pill,
  },
  accent: { backgroundColor: colors.accentSoft },
  secondary: { backgroundColor: colors.secondarySoft },
  neutral: { backgroundColor: colors.neutralSoft },
  outline: { borderWidth: borders.hairline, borderColor: colors.accent },
  overlay: { backgroundColor: colors.overlay },
});
