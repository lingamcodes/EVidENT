import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, opacity, radii, sizes, spacing } from '@/theme/tokens';
import { CoverImage } from './CoverImage';
import { Tag } from './Tag';
import { Text } from './Text';

type Props = {
  title: string;
  meta: string;
  imageUrl?: string | null;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  onPress: () => void;
  /** Greys out the card (e.g. drafts); the action stays fully visible. */
  dimmed?: boolean;
  /** Card width — carousels pass useEventCardWidth() so every card matches. */
  width: number;
};

/**
 * Carousel event card, styled like the invite cards: the whole photo (fitted over a
 * blurred copy of itself) with the title and details on a band across the bottom.
 */
export function EventCard({ title, meta, imageUrl, badge, actionLabel, onAction, onPress, dimmed = false, width }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <CoverImage uri={imageUrl ?? null} rounded={false} aspect={sizes.cardCoverAspect} fit="contain">
        {dimmed && <View style={styles.dimPhoto} />}
        <View style={[styles.band, dimmed && styles.dimmed]}>
          <Text variant="heading" tone="onOverlay" numberOfLines={1}>{title}</Text>
          <Text variant="small" tone="onOverlay" numberOfLines={1}>{meta}</Text>
        </View>
        {badge && (
          <View style={styles.badge}>
            <Tag label={badge} variant="overlay" />
          </View>
        )}
        {actionLabel && onAction && (
          <Pressable onPress={onAction} accessibilityRole="button" style={styles.action} hitSlop={spacing.xs}>
            <Tag label={actionLabel} variant="overlay" />
          </Pressable>
        )}
      </CoverImage>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  pressed: { opacity: opacity.dimmed },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.xxs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    backgroundColor: colors.overlay,
  },
  dimmed: { opacity: opacity.dimmed },
  dimPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surface, opacity: opacity.dimmed },
  badge: { position: 'absolute', top: spacing.sm + 1, left: spacing.sm + 1 },
  action: { position: 'absolute', top: spacing.sm + 1, right: spacing.sm + 1 },
});
