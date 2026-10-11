import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, colors, radii, shadows, spacing } from '@/theme/tokens';
import { Text } from './Text';

export type MenuItem = { label: string; onPress: () => void; tone?: 'default' | 'danger' };

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

/** A small list of options that opens from a button; tapping outside closes it. */
export function DropdownMenu({ visible, onClose, anchor, items, direction = 'down' }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  if (!anchor) return null;

  const position =
    direction === 'up'
      ? { bottom: screenHeight - anchor.y + spacing.xs, left: anchor.x, minWidth: anchor.width }
      : { top: anchor.y + anchor.height + spacing.xs, left: anchor.x, minWidth: anchor.width };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu">
        <View style={[styles.menu, position]} accessibilityRole="menu">
          {items.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.item, i > 0 && styles.divided, pressed && styles.pressed]}
            >
              <Text variant="label" tone={item.tone === 'danger' ? 'danger' : 'default'}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
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
});
