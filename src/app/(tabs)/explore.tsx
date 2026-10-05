import { View } from 'react-native';

import { Card, Screen, Text } from '@/components';
import { spacing } from '@/theme/tokens';

/** Placeholder until Explore (design 8a) is built. */
export default function ExploreScreen() {
  return (
    <Screen>
      <Text variant="title">Explore</Text>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text variant="heading">Coming soon</Text>
          <Text variant="body" tone="muted">Search for people, orgs and what's on this week.</Text>
        </View>
      </Card>
    </Screen>
  );
}
