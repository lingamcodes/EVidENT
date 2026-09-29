import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  /** Shown to the left of the switch; the whole row is tappable. */
  label?: string;
  accessibilityLabel?: string;
};

/** The design's small on/off switch (e.g. "Multiple days", "RSVP by"). */
export function Toggle({ value, onChange, label, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={spacing.xs}
      style={styles.row}
    >
      {label && <Text variant="label" tone="strong">{label}</Text>}
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: {
    width: sizes.toggle.width,
    height: sizes.toggle.height,
    padding: sizes.toggle.inset,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: colors.toggleOff,
  },
  trackOn: { alignItems: 'flex-end', backgroundColor: colors.accent },
  knob: {
    width: sizes.toggle.height - sizes.toggle.inset * 2,
    height: sizes.toggle.height - sizes.toggle.inset * 2,
    borderRadius: radii.pill,
    backgroundColor: colors.textOnAccent,
  },
});
