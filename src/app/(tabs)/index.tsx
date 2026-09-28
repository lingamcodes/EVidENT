import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, Card, Screen, Text } from '@/components';
import { signOut, useAuth } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

/** Placeholder Home until the feed (design 6b) is built. */
export default function HomeScreen() {
  const { profile } = useAuth();
  const firstName = profile?.name.split(' ')[0] || 'there';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={profile?.name ?? '?'} uri={profile?.avatar_url} size="lg" />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="title">Hey {firstName}</Text>
          {profile?.username && <Text variant="small" tone="muted">@{profile.username}</Text>}
        </View>
      </View>

      <Card>
        <Text variant="body" tone="strong">
          You're signed in. The home feed comes next; for now, account options live here.
        </Text>
      </Card>

      {/* TEMP: moves to a Settings screen once it exists. */}
      <View style={{ gap: spacing.sm }}>
        <Button
          label={profile?.has_password ? 'Change password' : 'Add a password'}
          variant="secondary"
          onPress={() => router.push('/set-password')}
          fullWidth
        />
        <Button label="Sign out" variant="dangerSoft" onPress={signOut} fullWidth />
      </View>
    </Screen>
  );
}
