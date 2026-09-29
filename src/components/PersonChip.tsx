import { Pressable, StyleSheet, View } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Props = {
  name: string;
  avatarUrl?: string | null;
  onRemove?: () => void;
};

/** Small pill with a face and name, e.g. a chosen invitee. */
export function PersonChip({ name, avatarUrl, onRemove }: Props) {
  return (
    <View style={styles.chip}>
      <Avatar name={name} uri={avatarUrl} size="xs" />
      <Text variant="label" numberOfLines={1}>{name}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={spacing.sm}>
          <Text variant="label" tone="subtle">×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xxs + 1,
    paddingLeft: spacing.xxs + 1,
    paddingRight: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
