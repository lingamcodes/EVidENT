import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { layout, sizes, spacing } from '@/theme/tokens';

/** Width for every card in an EventCarousel: nearly full width, with the next card peeking in. */
export function useEventCardWidth() {
  const { width } = useWindowDimensions();
  return width - layout.screenGutter * 2 - sizes.carouselPeek;
}

type Props = {
  /** EventCards sized with useEventCardWidth(). */
  children: ReactNode;
};

/** Horizontal row of EventCards with consistent spacing that snaps one card at a time. */
export function EventCarousel({ children }: Props) {
  const cardWidth = useEventCardWidth();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + spacing.md}
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
