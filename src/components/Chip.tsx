import { Pressable, StyleSheet, Text } from 'react-native';

import { borders, colors, radii, spacing, typography } from '@/theme/tokens';

type Props = {
  label: string;
  selected?: boolean;
  /** Share the row equally with sibling chips (e.g. the question-type picker). */
  stretch?: boolean;
  onPress: () => void;
};

/** Selectable pill — filters, interests, "All / People / Orgs / Events". */
export function Chip({ label, selected = false, stretch = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        stretch && styles.stretch,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[stretch ? typography.buttonTiny : typography.buttonSmall, { color: selected ? colors.textOnAccent : colors.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md + 1,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  stretch: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { backgroundColor: colors.pressedTint },
});
