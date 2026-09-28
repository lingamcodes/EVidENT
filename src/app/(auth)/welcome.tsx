import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Divider, Screen, Text } from '@/components';
import { signInWithGoogle } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const google = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm, paddingTop: spacing.xxxl }}>
        <Text variant="display">Evident</Text>
        <Text variant="body" tone="muted">
          Plans, in one place. Host, join and remember the things your people do together.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Button label="Continue with Google" variant="secondary" onPress={google} loading={busy} fullWidth />
        {error && <Text variant="small" tone="danger">{error}</Text>}
      </View>

      <Divider label="or" />

      <View style={{ gap: spacing.sm }}>
        <Button label="Sign up with email" onPress={() => router.push('/sign-up')} fullWidth />
        <Button label="I already have an account" variant="ghost" onPress={() => router.push('/log-in')} fullWidth />
      </View>

      <Text variant="caption" align="center">By continuing you agree to the community rules. Be normal.</Text>
    </Screen>
  );
}
