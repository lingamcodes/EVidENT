import { View } from 'react-native';

import { Card, Screen, Text } from '@/components';
import { spacing } from '@/theme/tokens';

/** Placeholder until the Planner (design 7a) is built. */
export default function PlannerScreen() {
  return (
    <Screen>
      <Text variant="title">Planner</Text>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text variant="heading">Coming soon</Text>
          <Text variant="body" tone="muted">A month view of everything you've said yes to.</Text>
        </View>
      </Card>
    </Screen>
  );
}
