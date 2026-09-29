import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MIN_PASSWORD_LENGTH, setPassword, useAuth } from '@/lib/auth';
import { spacing } from '@/theme/tokens';
import { Button } from '../Button';
import { Input } from '../Input';
import { Text } from '../Text';

type Props = {
  submitLabel: string;
  onDone: () => void;
};

/** New-password + confirm fields. Used for password reset and for adding a password to a Google/Apple account. */
export function NewPasswordForm({ submitLabel, onDone }: Props) {
  const { session } = useAuth();
  const [password, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD_LENGTH && confirm === password;

  const save = async () => {
    if (!session) return;
    setSaving(true);
    setError(undefined);
    try {
      await setPassword(session.user.id, password);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Input
        label="New password"
        value={password}
        onChangeText={setPw}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
      />
      <Input
        label="Reconfirm New Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={mismatch ? "Passwords don't match" : undefined}
      />
      {error && <Text variant="small" tone="danger">{error}</Text>}
      <Button label={submitLabel} onPress={save} loading={saving} disabled={!ready} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
