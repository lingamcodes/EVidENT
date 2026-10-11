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
  /** Greys out the photo and text (e.g. drafts); the action stays fully visible. */
  dimmed?: boolean;
};

/** Photo-topped event card used in the "You're going" / "Your events" carousels. */
export function EventCard({ title, meta, imageUrl, badge, actionLabel, onAction, onPress, dimmed = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Standard card shape so carousels line up; the photo fills it without stretching. */}
      <CoverImage uri={imageUrl ?? null} rounded={false} aspect={sizes.cardCoverAspect}>
        {dimmed && <View style={styles.dimPhoto} />}
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
      <View style={[styles.body, dimmed && styles.dimText]}>
        <Text variant="cardTitle" numberOfLines={1}>{title}</Text>
        <Text variant="meta" numberOfLines={1}>{meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: sizes.eventCard.width,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  dimPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surface, opacity: opacity.dimmed },
  dimText: { opacity: opacity.dimmed },
  badge: { position: 'absolute', top: spacing.sm + 1, left: spacing.sm + 1 },
  action: { position: 'absolute', top: spacing.sm + 1, right: spacing.sm + 1 },
  body: { gap: spacing.xxs, paddingTop: spacing.sm, paddingBottom: spacing.md - 2, paddingHorizontal: spacing.md },
});
