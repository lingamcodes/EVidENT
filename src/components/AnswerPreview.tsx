import { StyleSheet, View } from 'react-native';

import { borders, colors, radii, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  /** Dashed accent border — for follow-up prompts like "Guests list their allergies here". */
  dashed?: boolean;
};

/** Read-only pill showing the host what a guest will fill in. */
export function AnswerPreview({ label, dashed = false }: Props) {
  return (
    <View style={[styles.pill, dashed && styles.dashed]}>
      <Text variant="small" tone="subtle">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dashed: { borderStyle: 'dashed', borderColor: colors.dashedBorder },
});
