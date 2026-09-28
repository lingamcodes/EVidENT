import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme/tokens';

type Tone = 'default' | 'strong' | 'muted' | 'subtle' | 'accent' | 'success' | 'danger' | 'onAccent';

type Props = Omit<RNTextProps, 'style'> & {
  variant?: TypographyVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

const toneColors: Record<Tone, string> = {
  default: colors.text,
  strong: colors.textStrong,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  accent: colors.accentText,
  success: colors.success,
  danger: colors.danger,
  onAccent: colors.textOnAccent,
};

const defaultTone: Partial<Record<TypographyVariant, Tone>> = {
  eyebrow: 'subtle',
  meta: 'muted',
  caption: 'subtle',
};

export function Text({ variant = 'body', tone, align, ...rest }: Props) {
  const color = toneColors[tone ?? defaultTone[variant] ?? 'default'];
  return <RNText {...rest} style={[styles[variant], { color }, align && { textAlign: align }]} />;
}

const styles = StyleSheet.create(typography);
