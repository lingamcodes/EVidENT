import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton, Input, Screen, Text } from '@/components';
import { sendPasswordReset, signInWithEmail } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

export default function LogInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const logIn = async () => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log you in.');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(undefined);
    setNotice(undefined);
    if (!email.includes('@')) {
      setError('Type your email above first, then tap "Forgot password?".');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setNotice(`If ${email.trim()} has an account, a reset link is on its way. Open it on this phone.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    }
  };

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Welcome back</Text>
        <Text variant="body" tone="muted">
          Signed up with Google? Use that button instead, or log in here if you added a password.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        {error && <Text variant="small" tone="danger">{error}</Text>}
        {notice && <Text variant="small" tone="success">{notice}</Text>}
        <Button label="Log in" onPress={logIn} loading={busy} disabled={!email || !password} fullWidth />
        <Button label="Forgot password?" variant="ghost" onPress={forgot} />
      </View>
    </Screen>
  );
}
