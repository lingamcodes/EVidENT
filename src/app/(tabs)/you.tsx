import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, Divider, Screen, Text } from '@/components';
import { signOut, useAuth } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

/** Placeholder profile (design 3c comes later). Account options live here until Settings exists. */
export default function YouScreen() {
  const { profile } = useAuth();

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg }}>
        <Avatar name={profile?.name ?? '?'} uri={profile?.avatar_url} size="xl" />
        <Text variant="title">{profile?.name}</Text>
        {profile?.username && <Text variant="small" tone="muted">@{profile.username}</Text>}
        {profile?.bio && <Text variant="body" tone="strong" align="center">{profile.bio}</Text>}
      </View>

      <Divider />

      {/* TEMP: these move to a Settings screen. */}
      <View style={{ gap: spacing.sm }}>
        <Button
          label={profile?.has_password ? 'Change password' : 'Add a password'}
          variant="secondary"
          onPress={() => router.push('/set-password')}
          fullWidth
        />
        <Button label="Sign out" variant="dangerSoft" onPress={signOut} fullWidth />
        {__DEV__ && (
          <Button label="Dev: components gallery" variant="ghost" onPress={() => router.push('/dev-components')} />
        )}
      </View>
    </Screen>
  );
}
