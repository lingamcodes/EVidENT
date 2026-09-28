import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, spacing, typography } from '@/theme/tokens';

type Tab<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  tabs: Tab<K>[];
  value: K;
  onChange: (key: K) => void;
};

/** Underlined tabs — "Friends / Invites", "Upcoming / Past". */
export function Tabs<K extends string>({ tabs, value, onChange }: Props<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.active]}
          >
            <Text style={[typography.tab, { color: active ? colors.text : colors.textSubtle }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.sm + 1,
    borderBottomWidth: borders.thick,
    borderBottomColor: 'transparent',
  },
  active: { borderBottomColor: colors.text },
});
