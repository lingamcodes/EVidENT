import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { borders, colors, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useRevealAboveKeyboard } from './Screen';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  prefix?: string;
  trailing?: ReactNode;
  /** 'title' is the big centred event-title field. */
  size?: 'md' | 'sm' | 'title';
  /** Read-only field that looks normal because a wrapper opens a picker on tap (see DateTimeField). */
  picker?: boolean;
};

export function Input({
  label,
  hint,
  error,
  success,
  prefix,
  trailing,
  size = 'md',
  picker = false,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<View>(null);
  const revealAboveKeyboard = useRevealAboveKeyboard();
  const readOnly = rest.editable === false && !picker;
  const message = error ?? success ?? hint;
  const messageTone = error ? 'danger' : success ? 'success' : 'subtle';

  return (
    <View ref={fieldRef} style={styles.field}>
      {label && <Text variant="eyebrow">{label}</Text>}
      <View
        style={[
          styles.box,
          size === 'sm' && styles.boxSmall,
          size === 'title' && styles.boxTitle,
          multiline && styles.multiline,
          readOnly && styles.readOnly,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {prefix && <Text variant="label" tone="subtle">{prefix}</Text>}
        <TextInput
          {...rest}
          editable={picker ? false : rest.editable}
          pointerEvents={picker ? 'none' : undefined}
          multiline={multiline}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.accent}
          onFocus={(e) => {
            setFocused(true);
            if (fieldRef.current) revealAboveKeyboard?.(fieldRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            size === 'sm' && styles.inputSmall,
            size === 'title' && styles.inputTitle,
            multiline && styles.inputMultiline,
            readOnly && styles.inputReadOnly,
          ]}
        />
        {trailing}
      </View>
      {message && <Text variant="small" tone={messageTone}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  boxSmall: { paddingHorizontal: spacing.md + 1, paddingVertical: spacing.sm },
  boxTitle: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md + 1 },
  multiline: { borderRadius: radii.md, alignItems: 'flex-start' },
  readOnly: { backgroundColor: colors.surfaceSunken },
  focused: { borderColor: colors.borderFocus },
  errored: { borderColor: colors.danger },
  input: { flex: 1, padding: 0, color: colors.text, ...typography.input },
  inputSmall: typography.inputSmall,
  inputTitle: { ...typography.heading, textAlign: 'center' },
  inputReadOnly: { color: colors.textMuted },
  inputMultiline: { minHeight: sizes.textAreaMinHeight, textAlignVertical: 'top' },
});
