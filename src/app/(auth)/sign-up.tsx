import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, IconButton, Input, Screen, Text } from '@/components';
import { MIN_PASSWORD_LENGTH, signUpWithEmail } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const ready = name.trim() && email.includes('@') && password.length >= MIN_PASSWORD_LENGTH;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const needsConfirm = await signUpWithEmail(name.trim(), email.trim(), password);
      if (needsConfirm) setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Make your account</Text>
        <Text variant="body" tone="muted">A name, an email and a password. Everything else can wait.</Text>
      </View>

      {sentTo ? (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">Check your inbox</Text>
            <Text variant="body" tone="strong">
              We sent a link to {sentTo}. Open it on this phone to finish signing up.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Input label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
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
