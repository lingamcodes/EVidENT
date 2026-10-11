import { useRef } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { sizes } from '@/theme/tokens';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/**
 * Detects "pull down past the top of a list" so a nested list can hand control back
 * to the section above it. iOS lets the list overscroll (negative offset), so it
 * needs a deliberate pull of sizes.pullBackDistance. Android can't overscroll, so a
 * drag that starts and ends at the very top counts.
 */
export function usePullBack(onPullBack?: () => void) {
  const startY = useRef(0);
  return {
    onScrollBeginDrag: (e: ScrollEvent) => {
      startY.current = e.nativeEvent.contentOffset.y;
    },
    onScrollEndDrag: (e: ScrollEvent) => {
      if (!onPullBack) return;
      const endY = e.nativeEvent.contentOffset.y;
      const pulled = Platform.OS === 'ios' ? endY < -sizes.pullBackDistance : startY.current <= 1 && endY <= 1;
      if (pulled) onPullBack();
    },
  };
}
