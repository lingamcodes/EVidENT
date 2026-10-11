import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, radii, shadows, spacing, typography } from '@/theme/tokens';

type Tab<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  tabs: Tab<K>[];
  value: K;
  onChange: (key: K) => void;
  /**
   * Floating pill look (design 6b, when the tabs are stuck to the top while
   * scrolling): translucent bar, rounded ends, shadow; the active tab is a raised pill.
   */
  floating?: boolean;
};

/** Tabs — "Friends / Invites", "Upcoming / Past". Underlined, or a floating pill. */
export function Tabs<K extends string>({ tabs, value, onChange, floating = false }: Props<K>) {
  return (
    <View style={[styles.row, floating && styles.rowFloating]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.tab,
              floating ? styles.tabFloating : active && styles.active,
              floating && active && styles.activeFloating,
            ]}
          >
            <Text style={[typography.tab, { color: active ? colors.text : colors.textSubtle }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  rowFloating: {
    gap: spacing.xs,
    padding: spacing.xs,
    borderBottomWidth: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.floatingBar,
    boxShadow: shadows.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.sm + 1,
    borderBottomWidth: borders.thick,
    borderBottomColor: 'transparent',
  },
  active: { borderBottomColor: colors.text },
  tabFloating: { paddingVertical: spacing.sm, borderBottomWidth: 0, borderRadius: radii.pill },
  activeFloating: { backgroundColor: colors.background, boxShadow: shadows.sm },
});
