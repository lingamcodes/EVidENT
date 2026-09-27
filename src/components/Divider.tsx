import { StyleSheet, View } from 'react-native';

import { borders, colors, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = { label?: string };

/** Hairline rule, optionally with a centred word like "or". */
export function Divider({ label }: Props) {
  if (!label) return <View style={styles.line} />;

  return (
    <View style={styles.row}>
      <View style={[styles.line, styles.flex]} />
      <Text variant="eyebrow">{label}</Text>
      <View style={[styles.line, styles.flex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { height: borders.hairline, backgroundColor: colors.border },
  flex: { flex: 1 },
});
