import { Pressable, StyleSheet } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
};

/** Selectable card with a heading and a line of explanation (e.g. Public / Private). */
export function OptionCard({ title, subtitle, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && !selected && styles.pressed]}
    >
      <Text variant="heading">{title}</Text>
      {subtitle && <Text variant="small" tone={selected ? 'accent' : 'muted'}>{subtitle}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.lg - 2,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
  pressed: { backgroundColor: colors.pressedTint },
});
