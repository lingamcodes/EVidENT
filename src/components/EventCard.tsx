import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, radii, sizes, spacing } from '@/theme/tokens';
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
};

/** Photo-topped event card used in the "You're going" / "Your events" carousels. */
export function EventCard({ title, meta, imageUrl, badge, actionLabel, onAction, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
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
      </View>
      <View style={styles.body}>
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
  imageWrap: { height: sizes.eventCard.imageHeight },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.neutralMuted },
  badge: { position: 'absolute', top: spacing.sm + 1, left: spacing.sm + 1 },
  action: { position: 'absolute', top: spacing.sm + 1, right: spacing.sm + 1 },
  body: { gap: spacing.xxs, paddingTop: spacing.sm, paddingBottom: spacing.md - 2, paddingHorizontal: spacing.md },
});
