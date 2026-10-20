import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, colors, opacity, radii, shadows, spacing } from '@/theme/tokens';
import { Text } from './Text';

export type MenuItem = { label: string; onPress: () => void; tone?: 'default' | 'danger'; disabled?: boolean };

/** Where the menu hangs from: the trigger's position on screen (from measureInWindow). */
export type MenuAnchor = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor: MenuAnchor | null;
  items: MenuItem[];
  /** 'up' opens above the trigger (for buttons pinned to the bottom of the screen). */
  direction?: 'up' | 'down';
};

/** A small list of options that opens from a button over a darkened screen; tapping outside closes it. */
export function DropdownMenu({ visible, onClose, anchor, items, direction = 'down' }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  // The chosen action runs only once the menu has fully closed: iOS won't open
  // another popup (e.g. "Leave this event?") while this one is still closing.
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };
  if (!anchor) return null;

  const position =
    direction === 'up'
      ? { bottom: screenHeight - anchor.y + spacing.xs, left: anchor.x, minWidth: anchor.width }
      : { top: anchor.y + anchor.height + spacing.xs, left: anchor.x, minWidth: anchor.width };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={runPending}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu">
        <View style={[styles.menu, position]} accessibilityRole="menu">
          {items.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                pending.current = item.onPress;
                onClose();
                if (Platform.OS !== 'ios') setTimeout(runPending, 0);
              }}
              disabled={item.disabled}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: !!item.disabled }}
              style={({ pressed }) => [styles.item, i > 0 && styles.divided, pressed && styles.pressed]}
            >
              <View style={item.disabled && styles.disabled}>
                <Text variant="label" tone={item.tone === 'danger' ? 'danger' : 'default'}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  menu: {
    position: 'absolute',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    boxShadow: shadows.lg,
  },
  item: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  divided: { borderTopWidth: borders.hairline, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.pressedTint },
  disabled: { opacity: opacity.dimmed },
});
