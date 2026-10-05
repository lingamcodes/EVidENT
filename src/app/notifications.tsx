import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, IconButton, Screen, Text } from '@/components';
import { spacing } from '@/theme/tokens';

/** Placeholder until Notifications (design 9a) — push provider is still an open decision. */
export default function NotificationsScreen() {
  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />
      <Text variant="title">Notifications</Text>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text variant="heading">Coming soon</Text>
          <Text variant="body" tone="muted">RSVPs, invites and updates from hosts will show up here.</Text>
        </View>
      </Card>
    </Screen>
  );
}
