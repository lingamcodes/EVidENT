import { Pressable, StyleSheet } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Soft accent fill — used when the tile is the section's main call to action. */
  filled?: boolean;
  /** Fixed height for photo slots (cover photo, PayNow QR, question photo). */
  height?: number;
};

/** Dashed "+ Add …" tile. */
export function AddTile({ title, subtitle, onPress, filled = false, height }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [
        styles.tile,
        filled && styles.filled,
        height !== undefined && { height },
        pressed && styles.pressed,
      ]}
    >
      <Text variant="label" tone="accent" align="center">{title}</Text>
      {subtitle && <Text variant="small" tone="muted" align="center">{subtitle}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
  },
  filled: { backgroundColor: colors.accentSoft },
  pressed: { backgroundColor: colors.pressedAccentTint },
});
