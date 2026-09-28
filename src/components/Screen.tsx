import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (lists, maps). */
  scroll?: boolean;
};

/** Lets inputs ask the screen to scroll them above the keyboard. */
const KeyboardRevealContext = createContext<((field: View) => void) | null>(null);
export const useRevealAboveKeyboard = () => useContext(KeyboardRevealContext);

/** Gap kept between a focused field and the top of the keyboard. */
const KEYBOARD_GAP = spacing.xl;

/** Page wrapper: background, safe area, side gutters, and keeps focused fields above the keyboard. */
export function Screen({ children, scroll = true }: Props) {
  const scrollRef = useRef<ScrollView>(null);
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
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            onScroll={(e) => {
              offsetY.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        </KeyboardRevealContext.Provider>
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
