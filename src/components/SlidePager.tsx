import { Children, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { usePanelHeight } from './ScrollPanel';

type Props = {
  /** One child per slide (e.g. one InviteCard each). */
  children: ReactNode;
  height?: 'half' | 'fill';
};

/**
 * Vertical slideshow inside a bounded section: one item per slide, and a swipe snaps
 * to the next one instead of free-scrolling. Dots on the right show which slide
 * you're on.
 */
export function SlidePager({ children, height = 'fill' }: Props) {
  const pageHeight = usePanelHeight(height);
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);

  return (
    <View style={[styles.row, { height: pageHeight }]}>
      <ScrollView
        style={styles.flex}
        pagingEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / pageHeight))}
      >
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { height: pageHeight }]} accessibilityLabel={`${i + 1} of ${slides.length}`}>
            {slide}
          </View>
        ))}
      </ScrollView>
      {slides.length > 1 && (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  slide: { justifyContent: 'center' },
  dots: { justifyContent: 'center', gap: spacing.xs + 1 },
  dot: {
    width: sizes.scrollTrack + 2,
    height: sizes.scrollTrack + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
  },
  dotActive: { height: sizes.scrollThumbMin / 2, backgroundColor: colors.accent },
});
