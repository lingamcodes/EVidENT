import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, sizes, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /**
   * 'half' = half the screen. 'fill' = everything below a Tabs row down to the
   * bottom tab bar, once that row is scrolled to the top of the screen.
   */
  height?: 'half' | 'fill';
};

/**
 * A fixed-height section with its own vertical scroll, for lists that shouldn't push
 * the rest of the page down (e.g. Home's Friends / Invites). Blends into the page
 * background. Has an always-visible scroll bar on the right (the phone's own one
 * only appears while scrolling) that shows how far down you are. Height is a share
 * of the screen so it fits any phone; nested scrolling works on Android too.
 */
export function ScrollPanel({ children, height = 'half' }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelHeight = Math.round(
    height === 'fill'
      ? screenHeight - insets.top - insets.bottom - sizes.tabBarContentHeight - sizes.tabsRowHeight - spacing.md
      : screenHeight * sizes.scrollPanelScreenShare,
  );
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);

  const scrollable = contentHeight > panelHeight;
  // Thumb size = the visible fraction; position = how far through the scrollable range.
  const thumbHeight = scrollable ? Math.max(sizes.scrollThumbMin, (panelHeight / contentHeight) * panelHeight) : 0;
  const maxOffset = Math.max(1, contentHeight - panelHeight);
  const thumbTop = scrollable ? (Math.min(offset, maxOffset) / maxOffset) * (panelHeight - thumbHeight) : 0;

  return (
    <View style={[styles.row, { height: panelHeight }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => setOffset(e.nativeEvent.contentOffset.y)}
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
  content: { gap: spacing.md },
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
