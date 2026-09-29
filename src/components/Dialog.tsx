import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** Extra content between the message and the actions (e.g. a search list). */
  children?: ReactNode;
  /** Usually one or two <Button>s. */
  actions: ReactNode;
};

export function Dialog({ visible, onClose, title, message, children, actions }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close dialog">
        <Pressable style={styles.dialog} accessibilityRole="alert">
          <Text variant="dialogTitle">{title}</Text>
          {message && <Text variant="body" tone="strong">{message}</Text>}
          {children}
          <View style={styles.actions}>{actions}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.scrim,
  },
  dialog: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.lg,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
