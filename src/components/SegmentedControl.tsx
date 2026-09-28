import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, radii, spacing, typography } from '@/theme/tokens';

type Option<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  options: Option<K>[];
  value: K;
  onChange: (key: K) => void;
};

/** Joined pill of options — "Public / Private", "Calendar / List". */
export function SegmentedControl<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((opt, i) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={({ pressed }) => [
              styles.option,
              i > 0 && styles.divider,
              active && styles.active,
              pressed && !active && styles.pressed,
            ]}
          >
            <Text style={[typography.label, { color: active ? colors.textOnAccent : colors.text }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  option: { paddingVertical: spacing.sm - 2, paddingHorizontal: spacing.md },
  divider: { borderLeftWidth: borders.hairline, borderLeftColor: colors.border },
  active: { backgroundColor: colors.accent },
  pressed: { backgroundColor: colors.pressedTint },
});
