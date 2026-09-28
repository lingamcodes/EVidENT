import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, IconButton, Input, Screen, Text } from '@/components';
import { checkAccount, sendPasswordReset } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

/**
 * Sends Supabase's reset email. Its link opens the app on the "Set a new password"
 * screen (app/reset-password.tsx). Also how a Google-only account can get a password.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [noAccount, setNoAccount] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  const send = async () => {
    setBusy(true);
    setError(undefined);
    setNoAccount(false);
    try {
      const account = await checkAccount(email).catch(() => undefined);
      if (account && !account.exists) {
        setNoAccount(true);
        return;
      }
      await sendPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Reset your password</Text>
        <Text variant="body" tone="muted">We'll email you a link. Open it on this phone to choose a new password.</Text>
      </View>

      {sentTo ? (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">Check your inbox</Text>
            <Text variant="body" tone="strong">
              We sent a reset link to {sentTo}. It can take a minute, and may land in spam.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Input
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setNoAccount(false);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={noAccount ? "There's no account with this email yet." : undefined}
          />
          {noAccount && (
            <Button label="Sign up instead" variant="outline" size="sm" onPress={() => router.replace('/sign-up')} />
          )}
          {error && <Text variant="small" tone="danger">{error}</Text>}
          <Button label="Send reset link" onPress={send} loading={busy} disabled={!looksLikeEmail(email)} fullWidth />
        </View>
      )}
    </Screen>
  );
}
