import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (lists, maps). */
  scroll?: boolean;
};

/** Page wrapper: background, safe area, side gutters. Every screen starts with this. */
export function Screen({ children, scroll = true }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenGutter, paddingVertical: spacing.lg, gap: spacing.xl },
  fill: { flex: 1 },
});
