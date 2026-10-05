import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';
import { ChoiceMarker } from './ChoiceMarker';

type Props = {
  selected: boolean;
  onPress: () => void;
  /** Radio for pick-one, checkbox for pick-many. */
  marker?: 'radio' | 'checkbox';
  /** Row content after the marker — text, or e.g. a small Input + "max". */
  children: ReactNode;
  accessibilityLabel?: string;
};

/** One option in a pick-one list, shown as a bordered row with a radio marker. */
export function ChoiceRow({ selected, onPress, children, accessibilityLabel, marker = 'radio' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={marker === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, selected && styles.selected]}
    >
      <ChoiceMarker shape={marker} checked={selected} />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md - 1,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
});
