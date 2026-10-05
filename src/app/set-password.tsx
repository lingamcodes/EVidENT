import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton, Screen, Text } from '@/components';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { useAuth } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

/** Add a password to a Google/Apple account, or change an existing one. Moves into Settings later. */
export default function SetPasswordScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const email = session?.user.email ?? profile?.email;
  const adding = !profile?.has_password;

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">×</Text>} onPress={() => router.back()} accessibilityLabel="Close" variant="ghost" />
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">{adding ? 'Add a password' : 'Change password'}</Text>
        <Text variant="body" tone="muted">
          {adding
            ? `Then you can also log in with ${email ?? 'your email'} and this password.`
            : 'You will use this next time you log in with your email.'}
        </Text>
      </View>
      <NewPasswordForm
        submitLabel="Save password"
        onDone={async () => {
          await refreshProfile();
          router.back();
        }}
      />
    </Screen>
  );
}
