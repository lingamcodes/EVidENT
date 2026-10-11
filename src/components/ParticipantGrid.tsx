import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { borders, colors, opacity, radii, sizes, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Person = { id: string; name: string; avatarUrl?: string | null };

type Props = {
  people: Person[];
  /** Shown as "You" instead of their name. */
  meId?: string;
  /** Comes first in the row (e.g. the "You've invited" box). */
  leading?: ReactNode;
};

/** Everyone going, spread out: a face with the first name underneath. */
export function ParticipantGrid({ people, meId, leading }: Props) {
  return (
    <View style={styles.grid}>
      {leading}
      {people.map((p) => (
        <PersonTile key={p.id} person={p} label={p.id === meId ? 'You' : undefined} />
      ))}
    </View>
  );
}

type InvitedProps = {
  /** People you invited; `dimmed` = not going (yet). */
  people: (Person & { dimmed?: boolean })[];
  /** Ends the box with an "Invite" button (when you're allowed to invite). */
  inviteButton?: ReactNode;
};

/** "You've invited": a labelled box of the people you invited, plus the Invite button. */
export function InvitedBox({ people, inviteButton }: InvitedProps) {
  return (
    <View style={styles.box}>
      <Text variant="eyebrow">You've invited</Text>
      <View style={styles.grid}>
        {people.map((p) => (
          <PersonTile key={p.id} person={p} dimmed={p.dimmed} />
        ))}
        {inviteButton && (
          <View style={styles.tile}>
            <View style={styles.faceSlot}>{inviteButton}</View>
            <Text variant="small" tone="accent" align="center" numberOfLines={1}>Invite</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PersonTile({ person, label, dimmed }: { person: Person; label?: string; dimmed?: boolean }) {
  return (
    <View style={[styles.tile, dimmed && styles.dimmed]}>
      <Avatar name={person.name} uri={person.avatarUrl} size="md" />
      <Text variant="small" tone="strong" align="center" numberOfLines={1}>
        {label ?? person.name.split(' ')[0]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.md },
  tile: { width: sizes.participantTile, alignItems: 'center', gap: spacing.xs },
  // Same height as a face, so the captions line up.
  faceSlot: { height: sizes.avatar.md, justifyContent: 'center' },
  dimmed: { opacity: opacity.dimmed },
  box: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
