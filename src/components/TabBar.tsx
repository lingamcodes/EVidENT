import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borders, colors, radii, shadows, sizes, spacing } from '@/theme/tokens';
import { Text } from './Text';

/** The design's bottom bar: surface background, hairline on top. Children are the tabs. */
export function TabBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>{children}</View>;
}

type ItemProps = TabTriggerSlotProps & {
  label: string;
  icon: SymbolViewProps['name'];
};

/** One tab: icon over a small bold label; accent when active. Used as a TabTrigger child. */
export const TabBarItem = forwardRef<View, ItemProps>(function TabBarItem(
  { label, icon, isFocused, ...pressable },
  ref,
) {
  const tint = isFocused ? colors.accentText : colors.textSubtle;
  return (
    <Pressable
      ref={ref}
      {...pressable}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={styles.item}
    >
      <SymbolView name={icon} size={sizes.icon} tintColor={tint} />
      <Text variant="tabLabel" tone={isFocused ? 'accent' : 'subtle'}>{label}</Text>
    </Pressable>
  );
});

/** Raised accent "+" in the middle of the bar. It's an action, not a tab. */
export function CreateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create event"
      style={({ pressed }) => [styles.create, pressed && styles.createPressed]}
    >
      <Text variant="heading" tone="onAccent">+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm + 1,
    paddingHorizontal: spacing.xxl - 2,
    backgroundColor: colors.surface,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.border,
  },
  item: { alignItems: 'center', gap: spacing.xxs, minWidth: sizes.tabBarCreate },
  create: {
    width: sizes.tabBarCreate,
    height: sizes.tabBarCreate,
    marginTop: -spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    boxShadow: shadows.md,
  },
  createPressed: { backgroundColor: colors.accentPressed },
});
