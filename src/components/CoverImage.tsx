import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, sizes } from '@/theme/tokens';

type Props = {
  uri: string | null;
  /** Rounded corners for standalone use; off when it sits inside a card. */
  rounded?: boolean;
  /**
   * Fixed box shape (width ÷ height) so cards line up — the photo fills it, trimmed
   * at the edges, never stretched. Leave out to follow the photo's own shape.
   */
  aspect?: number;
  /** Overlays such as badges, positioned over the photo. */
  children?: ReactNode;
  accessibilityLabel?: string;
};

const { fallback, min, max } = sizes.coverAspect;
const clamp = (ratio: number) => Math.min(max, Math.max(min, ratio));

/**
 * Event cover whose box follows the photo's own shape (as cropped in the picker),
 * so it is never stretched. Very tall/wide photos are clamped and trimmed at the edges.
 */
export function CoverImage({ uri, rounded = true, aspect, children, accessibilityLabel }: Props) {
  const [natural, setNatural] = useState(fallback);
  const ratio = aspect ?? natural;

  return (
    <View style={[styles.box, { aspectRatio: ratio }, rounded && styles.rounded]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={accessibilityLabel}
          onLoad={(e) => {
            const { width, height } = e.source;
            if (!aspect && width && height) setNatural(clamp(width / height));
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
  rounded: { borderRadius: radii.lg },
  placeholder: { backgroundColor: colors.neutralMuted },
});
