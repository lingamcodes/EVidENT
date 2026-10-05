import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors, sizes } from '@/theme/tokens';

type Tone = 'default' | 'muted' | 'subtle' | 'accent' | 'onAccent';

const toneColors: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  accent: colors.accentText,
  onAccent: colors.textOnAccent,
};

type Props = {
  /** SF Symbol on iOS, Material Symbol on Android, e.g. { ios: 'bell', android: 'notifications' }. */
  name: SymbolViewProps['name'];
  tone?: Tone;
  size?: 'md' | 'sm';
};

/** App icon (system symbols), coloured from tokens. */
export function Icon({ name, tone = 'default', size = 'md' }: Props) {
  return (
    <SymbolView
      name={name}
      size={size === 'md' ? sizes.icon : sizes.iconSmall}
      tintColor={toneColors[tone]}
    />
  );
}
