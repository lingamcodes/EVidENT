import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Small uppercase label with an optional "See all" link. */
export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text variant="eyebrow" accessibilityRole="header">{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={spacing.sm}>
          <Text variant="small" tone="accent">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
