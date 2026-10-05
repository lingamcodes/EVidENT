import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borders, colors, layout, radii, shadows, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  message: string | null;
  onDismiss: () => void;
  /** Auto-hide after this many ms. */
  duration?: number;
};

const DEFAULT_DURATION = 5000;

/** Floating message at the top of the screen. Tap to dismiss; hides itself after a few seconds. */
export function Toast({ message, onDismiss, duration = DEFAULT_DURATION }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityHint="Tap to dismiss"
      style={[styles.toast, { top: insets.top + spacing.sm }]}
    >
      <Text variant="body">{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    boxShadow: shadows.md,
  },
});
