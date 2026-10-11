import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, radii, sizes, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { CoverImage } from './CoverImage';
import { Text } from './Text';

type Status = 'yes' | 'maybe' | 'no' | null;

type Props = {
  inviterName: string;
  inviterAvatarUrl?: string | null;
  title: string;
  coverUrl?: string | null;
  friendsGoing: number;
  when: string;
  where?: string | null;
  /** Your reply so far; null = not answered yet (shows Accept / Decline). */
  status: Status;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onUndo: () => void;
  onPress: () => void;
};

const resultText: Record<Exclude<Status, null>, string> = {
  yes: "You're going",
  maybe: 'You said maybe',
  no: 'You declined',
};

/** Home "Invites" card (design 6b): who invited you, when/where, Accept · Decline, then Undo. */
export function InviteCard({
  inviterName,
  inviterAvatarUrl,
  title,
  coverUrl,
  friendsGoing,
  when,
  where,
  status,
  busy = false,
  onAccept,
  onDecline,
  onUndo,
  onPress,
}: Props) {
  const friends = friendsGoing ? `${friendsGoing} friend${friendsGoing === 1 ? '' : 's'} going` : null;

  const heading = (onPhoto: boolean) => (
    <View style={styles.headingRow}>
      <Avatar name={inviterName} uri={inviterAvatarUrl} size="sm" ringed />
      <View style={styles.flex}>
        <Text variant="small" tone={onPhoto ? 'onOverlay' : 'muted'} numberOfLines={1}>
          {inviterName} invites you to
        </Text>
        <Text variant="heading" tone={onPhoto ? 'onOverlay' : 'default'} numberOfLines={2}>
          {title}
        </Text>
        {friends && <Text variant="small" tone={onPhoto ? 'onOverlay' : 'subtle'}>{friends}</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${inviterName} invites you to ${title}`}>
        {coverUrl ? (
          <CoverImage uri={coverUrl} rounded={false} aspect={sizes.cardCoverAspect}>
            <View style={styles.overlay}>{heading(true)}</View>
          </CoverImage>
        ) : (
          <View style={styles.plainHeading}>{heading(false)}</View>
        )}
        <View style={styles.details}>
          <View style={styles.flex}>
            <Text variant="eyebrow">When</Text>
            <Text variant="label">{when}</Text>
          </View>
          {where && (
            <View style={styles.flex}>
              <Text variant="eyebrow">Where</Text>
              <Text variant="label" numberOfLines={1}>{where}</Text>
            </View>
          )}
        </View>
      </Pressable>

      {status === null ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onAccept}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text variant="label" tone="accent">Accept</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            onPress={onDecline}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text variant="label" tone="muted">Decline</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.actions, styles.result]}>
          <Text variant="label" tone={status === 'yes' ? 'success' : 'muted'}>{resultText[status]}</Text>
          <Button label="Undo" variant="ghost" size="sm" onPress={onUndo} disabled={busy} />
        </View>
      )}
    </View>
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
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md + 2,
    backgroundColor: colors.overlay,
  },
  plainHeading: { paddingTop: spacing.md + 2, paddingHorizontal: spacing.md + 2 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
  details: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.md + 2 },
  actions: { flexDirection: 'row', borderTopWidth: borders.hairline, borderTopColor: colors.border },
  action: { flex: 1, alignItems: 'center', paddingVertical: spacing.md + 1 },
  actionPressed: { backgroundColor: colors.pressedTint },
  actionDivider: { width: borders.hairline, backgroundColor: colors.border },
  result: { alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.md + 2, paddingRight: spacing.xs },
});
