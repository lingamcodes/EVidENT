import { Children, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { usePullBack } from './pullBack';
import { usePanelHeight } from './ScrollPanel';

type Props = {
  /** One child per slide (e.g. one InviteCard each). */
  children: ReactNode;
  /** 'content' = exactly as tall as the tallest slide's content (no empty space above it). */
  height?: 'half' | 'fill' | 'content';
  /** Pulling down on the first slide (e.g. back to the section above). */
  onPullBack?: () => void;
  /** Which slide is showing (0-based). */
  onIndexChange?: (index: number) => void;
};

/**
 * Vertical slideshow inside a bounded section: one item per slide, and a swipe snaps
 * to the next one instead of free-scrolling. Dots on the right show which slide
 * you're on.
 */
export function SlidePager({ children, height = 'fill', onPullBack, onIndexChange }: Props) {
  const panelHeight = usePanelHeight(height === 'content' ? 'fill' : height);
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const pullBack = usePullBack(onPullBack);
  // 'content': measure each slide's natural height and size every page to the tallest.
  const [contentHeight, setContentHeight] = useState(0);
  const pageHeight = height === 'content' && contentHeight ? contentHeight : panelHeight;

  return (
    <View style={[styles.row, { height: pageHeight }]}>
      <ScrollView
        style={styles.flex}
        pagingEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.y / pageHeight);
          setIndex(next);
          onIndexChange?.(next);
        }}
        onScrollBeginDrag={pullBack.onScrollBeginDrag}
        onScrollEndDrag={pullBack.onScrollEndDrag}
      >
        {slides.map((slide, i) => (
          <View
            key={i}
            style={[styles.slide, height === 'content' && styles.slideTop, { height: pageHeight }]}
            accessibilityLabel={`${i + 1} of ${slides.length}`}
          >
            <View
              onLayout={(e) => {
                if (height !== 'content') return;
                // Read now: the event object is released before a deferred state update runs.
                const measured = Math.ceil(e.nativeEvent.layout.height);
                setContentHeight((h) => Math.max(h, measured));
              }}
            >
              {slide}
            </View>
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
  slideTop: { justifyContent: 'flex-start' },
  dots: { justifyContent: 'center', gap: spacing.xs + 1 },
  dot: {
    width: sizes.scrollTrack + 2,
    height: sizes.scrollTrack + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
  },
  dotActive: { height: sizes.scrollThumbMin / 2, backgroundColor: colors.accent },
});
