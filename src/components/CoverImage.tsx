import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, sizes } from '@/theme/tokens';

type Props = {
  uri: string | null;
  /** Rounded corners for standalone use; off when it sits inside a card. */
  rounded?: boolean;
  /** Overlays such as badges, positioned over the photo. */
  children?: ReactNode;
  accessibilityLabel?: string;
};

const [ratioW, ratioH] = sizes.coverRatio;

/**
 * Event cover in the standard 3:2 box. Covers are cropped to 3:2 on upload; older
 * photos in other shapes fill the box (trimmed at the edges, never stretched).
 */
export function CoverImage({ uri, rounded = true, children, accessibilityLabel }: Props) {
  return (
    <View style={[styles.box, rounded && styles.rounded]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={accessibilityLabel} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: ratioW / ratioH, overflow: 'hidden' },
  rounded: { borderRadius: radii.lg },
  placeholder: { backgroundColor: colors.neutralMuted },
});
