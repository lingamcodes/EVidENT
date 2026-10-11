import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, opacity, radii, sizes, spacing } from '@/theme/tokens';
import { AvatarStack } from './AvatarStack';
import { CoverImage } from './CoverImage';
import { Tag } from './Tag';
import { Text } from './Text';

type Props = {
  title: string;
  /** "By @host", right under the photo. */
  host?: string;
  meta: string;
  imageUrl?: string | null;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  onPress: () => void;
  /** Greys out the photo and text (e.g. drafts); the action stays fully visible. */
  dimmed?: boolean;
  /** Override the standard card width (Home shrinks cards to fit one screen). */
  width?: number;
  /** People you follow who are going: faces on the photo (up to 3), "+N" for the rest. */
  friends?: { id: string; name: string; avatarUrl?: string | null }[];
  friendsCount?: number;
};

/** Photo-topped event card used in the "You're going" / "Your events" carousels. */
export function EventCard({ title, host, meta, imageUrl, badge, actionLabel, onAction, onPress, dimmed = false, width, friends = [], friendsCount = friends.length }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, host, meta].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.card, width !== undefined && { width }, pressed && styles.pressed]}
    >
      {/* Standard square cover so carousels line up. */}
      <CoverImage uri={imageUrl ?? null} rounded={false}>
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
        {friends.length > 0 && (
          <View style={styles.friends}>
            <AvatarStack people={friends} size="xs" />
            {friendsCount > friends.length && <Tag label={`+${friendsCount - friends.length}`} variant="overlay" />}
          </View>
        )}
      </CoverImage>
      <View style={[styles.body, dimmed && styles.dimText]}>
        {host && <Text variant="meta" tone="muted" numberOfLines={1}>{host}</Text>}
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
  friends: {
    position: 'absolute',
    bottom: spacing.sm + 1,
    left: spacing.sm + 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  action: { position: 'absolute', top: spacing.sm + 1, right: spacing.sm + 1 },
  body: { gap: spacing.xxs, paddingTop: spacing.sm, paddingBottom: spacing.md - 2, paddingHorizontal: spacing.md },
});
