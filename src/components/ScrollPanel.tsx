import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { borders, colors, radii, sizes, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
};

/**
 * A fixed-height box with its own vertical scroll, for lists that shouldn't push the
 * rest of the page down (e.g. Home's Friends / Invites). Height is a share of the
 * screen so it fits any phone; nested scrolling works on Android too.
 */
export function ScrollPanel({ children }: Props) {
  const { height } = useWindowDimensions();
  return (
    <ScrollView
      style={[styles.panel, { height: Math.round(height * sizes.scrollPanelScreenShare) }]}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
      showsVerticalScrollIndicator
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  content: { gap: spacing.md, padding: spacing.md },
});
