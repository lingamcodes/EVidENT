import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { borders, colors, fonts, radii, sizes } from '@/theme/tokens';

type Size = keyof typeof sizes.avatar;

type Props = {
  name: string;
  uri?: string | null;
  size?: Size;
  ringed?: boolean;
};

export function Avatar({ name, uri, size = 'md', ringed = false }: Props) {
  const dimension = sizes.avatar[size];
  const frame = [
    styles.base,
    { width: dimension, height: dimension },
    ringed && styles.ring,
  ];

  if (uri) {
    return <Image source={{ uri }} style={frame} contentFit="cover" accessibilityLabel={name} />;
  }

  return (
    <View style={[frame, styles.fallback]} accessibilityLabel={name}>
      <Text style={[styles.initial, { fontSize: dimension * 0.41 }]}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, overflow: 'hidden' },
  ring: { borderWidth: borders.thick, borderColor: colors.background },
  fallback: { backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.heading, color: colors.accentStrongText },
});
