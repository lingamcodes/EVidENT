import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borders, colors, layout, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (lists, maps). */
  scroll?: boolean;
  /** Pinned below the scrolling content, e.g. a Publish / Save bar. */
  footer?: ReactNode;
  /**
   * Instagram-style header: slides away as you scroll down and comes back as soon
   * as you scroll up (always shown at the top of the page).
   */
  collapsingHeader?: ReactNode;
  /** Indexes of direct children that stick to the top while scrolling (e.g. tabs). */
  stickyHeaderIndices?: number[];
  /** Page scroll position, for screens that react to it (e.g. restyling stuck tabs). */
  onScrollY?: (y: number) => void;
};

/** Lets inputs ask the screen to scroll them above the keyboard. */
const KeyboardRevealContext = createContext<((field: View) => void) | null>(null);
export const useRevealAboveKeyboard = () => useContext(KeyboardRevealContext);

/** Gap kept between a focused field and the top of the keyboard. */
const KEYBOARD_GAP = spacing.xl;

/** Page wrapper: background, safe area, side gutters, and keeps focused fields above the keyboard. */
export function Screen({ children, scroll = true, footer, collapsingHeader, stickyHeaderIndices, onScrollY }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  // Collapsing header: hide distance follows scroll, clamped to the header's height,
  // so any upward scroll starts bringing it back.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerOffset = Animated.diffClamp(
    scrollY.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: 'clamp' }),
    0,
    Math.max(headerHeight, 1),
  ).interpolate({ inputRange: [0, Math.max(headerHeight, 1)], outputRange: [0, -Math.max(headerHeight, 1)] });
  const offsetY = useRef(0);
  const keyboardHeight = useRef(0);
  const pendingField = useRef<View | null>(null);

  const reveal = useCallback((field: View) => {
    field.measureInWindow((_x, y, _w, height) => {
      const visibleBottom = Dimensions.get('window').height - keyboardHeight.current - KEYBOARD_GAP;
      const overlap = y + height - visibleBottom;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: offsetY.current + overlap, animated: true });
    });
  }, []);

  // iOS only: Android resizes the window for the keyboard and scrolls natively.
  const requestReveal = useCallback(
    (field: View) => {
      if (Platform.OS !== 'ios') return;
      if (keyboardHeight.current > 0) reveal(field);
      else pendingField.current = field; // keyboard not up yet; reveal once it is
    },
    [reveal],
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardHeight.current = e.endCoordinates.height;
      if (pendingField.current) {
        reveal(pendingField.current);
        pendingField.current = null;
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeight.current = 0;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <KeyboardRevealContext.Provider value={requestReveal}>
          {/* Starts below the status bar and clips the header as it slides up. */}
          <View style={styles.scrollArea}>
            <Animated.ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.content, collapsingHeader ? { paddingTop: headerHeight + spacing.lg } : null]}
              stickyHeaderIndices={stickyHeaderIndices}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: true,
                listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
                  offsetY.current = e.nativeEvent.contentOffset.y;
                  onScrollY?.(e.nativeEvent.contentOffset.y);
                },
              })}
              scrollEventThrottle={16}
            >
              {children}
            </Animated.ScrollView>
            {collapsingHeader && (
              <Animated.View
                style={[styles.collapsingHeader, { transform: [{ translateY: headerOffset }] }]}
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
              >
                {collapsingHeader}
              </Animated.View>
            )}
          </View>
        </KeyboardRevealContext.Provider>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenGutter, paddingVertical: spacing.lg, gap: spacing.xl },
  fill: { flex: 1 },
  scrollArea: { flex: 1, overflow: 'hidden' },
  collapsingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.border,
  },
});
