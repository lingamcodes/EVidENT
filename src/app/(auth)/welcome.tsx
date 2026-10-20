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
        <Button label="Sign in" onPress={() => router.push('/log-in')} fullWidth />
        <Button label="New here? Sign up with email" variant="ghost" onPress={() => router.push('/sign-up')} fullWidth />
      </View>

      <Text variant="caption" align="center">By continuing you agree to the community rules. Be normal.</Text>
    </Screen>
  );
}
