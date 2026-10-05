import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { layout, sizes, spacing } from '@/theme/tokens';

type Props = {
  /** EventCards — all the same size, so the carousel snaps card by card. */
  children: ReactNode;
};

/** Horizontal row of EventCards with consistent spacing that snaps one card at a time. */
export function EventCarousel({ children }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={sizes.eventCard.width + spacing.md}
      snapToAlignment="start"
      decelerationRate="fast"
      // Bleed to the screen edges so cards slide under the gutters, but start aligned with content.
      style={styles.bleed}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -layout.screenGutter },
  row: { gap: spacing.md, paddingHorizontal: layout.screenGutter },
});
