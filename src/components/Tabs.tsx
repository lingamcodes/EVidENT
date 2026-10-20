import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, spacing, typography } from '@/theme/tokens';
import { CountBadge } from './CountBadge';

type Tab<K extends string> = {
  key: K;
  label: string;
  /** Red bubble with the number of unseen items; hidden at 0. */
  badge?: number;
};

type Props<K extends string> = {
  tabs: Tab<K>[];
  value: K;
  onChange: (key: K) => void;
  /** 'lg' = bigger labels (Home's Friends | Invites). */
  size?: 'md' | 'lg';
};

/** Underlined tabs — "Friends / Invites", "Upcoming / Past" — with optional unseen badges. */
export function Tabs<K extends string>({ tabs, value, onChange, size = 'md' }: Props<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        const count = tab.badge ?? 0;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={count ? `${tab.label}, ${count} new` : tab.label}
            style={[styles.tab, active && styles.active]}
          >
            <View style={styles.labelRow}>
              <Text
                style={[size === 'lg' ? typography.tabLarge : typography.tab, { color: active ? colors.text : colors.textSubtle }]}
              >
                {tab.label}
              </Text>
              <CountBadge count={count} />
            </View>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 1 },
});
