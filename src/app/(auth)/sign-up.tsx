import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, IconButton, Input, Screen, Text } from '@/components';
import {
  checkAccount,
  MIN_PASSWORD_LENGTH,
  resendConfirmation,
  signUpWithEmail,
  useGoogleSignIn,
  type AccountCheck,
} from '@/lib/auth';
import { spacing } from '@/theme/tokens';

const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function SignUpScreen() {
  const google = useGoogleSignIn();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ to: string; resent: boolean }>();
  const [existing, setExisting] = useState<AccountCheck>();

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const ready = name.trim() && looksLikeEmail(email) && password.length >= MIN_PASSWORD_LENGTH && !existing?.confirmed;

  /** Warns early if the email already belongs to an account. */
  const checkEmail = async () => {
    if (!looksLikeEmail(email)) return undefined;
    try {
      const result = await checkAccount(email);
      setExisting(result.exists ? result : undefined);
      return result;
    } catch {
      return undefined; // the check is a convenience; sign-up still works without it
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await checkEmail();
      if (result?.exists && result.confirmed) return; // the "already have an account" card is showing
      if (result?.exists && !result.confirmed) {
        await resendConfirmation(email);
        setSent({ to: email.trim(), resent: true });
        return;
      }
      const needsConfirm = await signUpWithEmail(name.trim(), email.trim(), password);
      if (needsConfirm) setSent({ to: email.trim(), resent: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const goToLogIn = () => router.replace({ pathname: '/log-in', params: { email: email.trim() } });

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Make your account</Text>
        <Text variant="body" tone="muted">A name, an email and a password. Everything else can wait.</Text>
      </View>

      {sent ? (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">Check your inbox</Text>
            <Text variant="body" tone="strong">
              {sent.resent
                ? `You started signing up with ${sent.to} before, so we sent the confirmation link again.`
                : `We sent a link to ${sent.to}.`}{' '}
              Open it on this phone to finish signing up.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Input label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Input
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setExisting(undefined);
            }}
            onBlur={checkEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          {existing?.confirmed && (
            <Card tone="sunken">
              <View style={{ gap: spacing.sm }}>
                <Text variant="bodyStrong">You already have an account with this email.</Text>
                <Text variant="small" tone="muted">
                  {existing.has_password && existing.has_google
                    ? 'Log in with your password, or continue with Google.'
                    : existing.has_password
                      ? 'Log in with your password instead.'
                      : 'It signs in with Google. Continue with Google, then add a password from Home if you want one.'}
                </Text>
                {existing.has_password && <Button label="Log in instead" size="sm" onPress={goToLogIn} fullWidth />}
                {existing.has_google && (
                  <Button
                    label="Continue with Google"
                    variant="secondary"
                    size="sm"
                    onPress={google.start}
                    loading={google.busy}
                    fullWidth
                  />
                )}
                {google.error && <Text variant="small" tone="danger">{google.error}</Text>}
              </View>
            </Card>
          )}

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
          />
          {error && <Text variant="small" tone="danger">{error}</Text>}
          <Button label="Create account" onPress={submit} loading={busy} disabled={!ready} fullWidth />
        </View>
      )}
    </Screen>
  );
}
