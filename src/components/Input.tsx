import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { borders, colors, radii, sizes, spacing, typography } from '@/theme/tokens';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  prefix?: string;
  trailing?: ReactNode;
  size?: 'md' | 'sm';
};

export function Input({
  label,
  hint,
  error,
  success,
  prefix,
  trailing,
  size = 'md',
  multiline,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const message = error ?? success ?? hint;
  const messageTone = error ? 'danger' : success ? 'success' : 'subtle';

  return (
    <View style={styles.field}>
      {label && <Text variant="eyebrow">{label}</Text>}
      <View
        style={[
          styles.box,
          size === 'sm' && styles.boxSmall,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {prefix && <Text variant="label" tone="subtle">{prefix}</Text>}
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, size === 'sm' && styles.inputSmall, multiline && styles.inputMultiline]}
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
  multiline: { borderRadius: radii.md, alignItems: 'flex-start' },
  focused: { borderColor: colors.borderFocus },
  errored: { borderColor: colors.danger },
  input: { flex: 1, padding: 0, color: colors.text, ...typography.input },
  inputSmall: typography.inputSmall,
  inputMultiline: { minHeight: sizes.textAreaMinHeight, textAlignVertical: 'top' },
});
