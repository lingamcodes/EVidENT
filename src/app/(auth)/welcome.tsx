import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Divider, Screen, Text } from '@/components';
import { useGoogleSignIn } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  const google = useGoogleSignIn();

  return (
    <Screen>
      <View style={{ gap: spacing.sm, paddingTop: spacing.xxxl }}>
        <Text variant="display">Evident</Text>
        <Text variant="body" tone="muted">
          Plans, in one place. Host, join and remember the things your people do together.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Button label="Continue with Google" variant="secondary" onPress={google.start} loading={google.busy} fullWidth />
        {google.error && <Text variant="small" tone="danger">{google.error}</Text>}
      </View>

      <Divider label="or" />

      <View style={{ gap: spacing.sm }}>
        <Button label="Sign up with email" onPress={() => router.push('/sign-up')} fullWidth />
        <Button label="I already have an account" variant="ghost" onPress={() => router.push('/log-in')} fullWidth />
      </View>

      <Text variant="caption" align="center">By continuing you agree to the community rules. Be normal.</Text>
      {/* TEMP debug: the return address sent to Supabase. Remove once Google sign-in works in Expo Go. */}
      <Text variant="caption" align="center" selectable>Return address: {makeRedirectUri()}</Text>
    </Screen>
  );
}
