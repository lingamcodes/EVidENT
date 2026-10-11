import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { usePullBack } from './pullBack';

type PanelHeight = 'half' | 'fill' | number;

type Props = {
  children: ReactNode;
  /**
   * 'half' = half the screen. 'fill' = everything below a Tabs row down to the
   * bottom tab bar. A number = exactly that many points (when the screen measures it).
   */
  height?: PanelHeight;
  /** Called with the list's scroll position. */
  onScrollY?: (y: number) => void;
  /** Pulling down past the top of the list (e.g. back to the slide above). */
  onPullBack?: () => void;
};

/** Height of a bounded section: half the screen, the screen below a Tabs row, or exact. */
export function usePanelHeight(height: PanelHeight) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (typeof height === 'number') return height;
  return Math.round(
    height === 'fill'
      ? screenHeight - insets.top - insets.bottom - sizes.tabBarContentHeight - sizes.tabsRowHeight - spacing.md
      : screenHeight * sizes.scrollPanelScreenShare,
  );
}

/**
 * A fixed-height section with its own vertical scroll, for lists that shouldn't push
 * the rest of the page down (e.g. Home's Friends). Blends into the page background.
 * Has an always-visible scroll bar on the right (the phone's own one only appears
 * while scrolling). Nested scrolling works on Android too.
 */
export function ScrollPanel({ children, height = 'half', onScrollY, onPullBack }: Props) {
  const panelHeight = usePanelHeight(height);
  const pullBack = usePullBack(onPullBack);
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);

  const scrollable = contentHeight > panelHeight;
  // Thumb size = the visible fraction; position = how far through the scrollable range.
  const thumbHeight = scrollable ? Math.max(sizes.scrollThumbMin, (panelHeight / contentHeight) * panelHeight) : 0;
  const maxOffset = Math.max(1, contentHeight - panelHeight);
  const thumbTop = scrollable ? (Math.min(Math.max(offset, 0), maxOffset) / maxOffset) * (panelHeight - thumbHeight) : 0;

  return (
    <View style={[styles.row, { height: panelHeight }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setOffset(y);
          onScrollY?.(y);
        }}
        onScrollBeginDrag={pullBack.onScrollBeginDrag}
        onScrollEndDrag={pullBack.onScrollEndDrag}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
      >
        {children}
      </ScrollView>
      {scrollable && (
        <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.thumb, { height: thumbHeight, top: thumbTop }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  content: { gap: spacing.md, paddingTop: spacing.sm },
  track: {
    width: sizes.scrollTrack,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.textSubtle,
  },
});
