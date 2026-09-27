import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  /** Sentence with bold parts, e.g. <><Bold>Rachel</Bold> is going to <Bold>5k</Bold></> */
  children: ReactNode;
  time: string;
  thumbUrl?: string | null;
  thumbShape?: 'rounded' | 'circle';
  onPress?: () => void;
};

/** One line of activity — the feed and notifications list. */
export function ActivityRow({ children, time, thumbUrl, thumbShape = 'rounded', onPress }: Props) {
  const thumbStyle = [styles.thumb, thumbShape === 'circle' && styles.circle];

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={thumbStyle} contentFit="cover" />
        ) : (
          <View style={[thumbStyle, styles.placeholder]} />
        )}
        <View style={styles.text}>
          <Text variant="body">{children}</Text>
          <Text variant="caption">{time}</Text>
        </View>
      </View>
    </Card>
  );
}

/** Bold span for use inside an ActivityRow sentence. */
export function Bold({ children }: { children: ReactNode }) {
  return <Text variant="bodyStrong">{children}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: sizes.thumb, height: sizes.thumb, borderRadius: radii.thumb },
  circle: { borderRadius: radii.pill },
  placeholder: { backgroundColor: colors.neutralMuted },
  text: { flex: 1, gap: spacing.xs },
});
