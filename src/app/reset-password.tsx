import { View } from 'react-native';

import { Screen, Text } from '@/components';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { useAuth } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

/** Where Supabase's password-reset email lands. */
export default function ResetPasswordScreen() {
  const { finishPasswordRecovery } = useAuth();

  return (
    <Screen>
      <View style={{ gap: spacing.xs, paddingTop: spacing.xl }}>
        <Text variant="title">Set a new password</Text>
        <Text variant="body" tone="muted">Pick something you haven't used here before.</Text>
      </View>
      <NewPasswordForm submitLabel="Save password" onDone={finishPasswordRecovery} />
    </Screen>
  );
}
