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
  /** Comes first in the row (e.g. the Invite tile and the "You've invited" box). */
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

/** A face-sized button with a caption, e.g. the "Invite" tile. */
export function ActionTile({ button, label }: { button: ReactNode; label: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.faceSlot}>{button}</View>
      <Text variant="small" tone="accent" align="center" numberOfLines={1}>{label}</Text>
    </View>
  );
}

/**
 * "You've invited": a box around the people you invited, labelled at the side.
 * It lines up with the rest of the row: faces and names sit at the same height.
 */
export function InvitedBox({ people }: { people: (Person & { dimmed?: boolean })[] }) {
  if (!people.length) return null;
  return (
    <View style={styles.box}>
      <View style={styles.faceSlot}>
        <Text variant="eyebrow">{"You've\ninvited"}</Text>
      </View>
      {people.map((p) => (
        <PersonTile key={p.id} person={p} dimmed={p.dimmed} />
      ))}
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
  // Vertical padding is cancelled by negative margin so the faces stay level with the row.
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: -spacing.xs,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
