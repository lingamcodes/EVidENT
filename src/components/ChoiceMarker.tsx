import { StyleSheet, View } from 'react-native';

import { borders, colors, radii, sizes } from '@/theme/tokens';

type Props = {
  shape: 'radio' | 'checkbox';
  checked?: boolean;
};

/** Circle (pick one) or square (pick many) shown before an answer option. */
export function ChoiceMarker({ shape, checked = false }: Props) {
  const isRadio = shape === 'radio';

  return (
    <View
      style={[styles.box, isRadio ? styles.radio : styles.checkbox, checked && styles.checked]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {checked && <View style={[styles.inner, isRadio ? styles.radio : styles.innerSquare]} />}
    </View>
  );
}

const inner = sizes.choiceMarker / 2;

const styles = StyleSheet.create({
  box: {
    width: sizes.choiceMarker,
    height: sizes.choiceMarker,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.marker,
    borderColor: colors.markerBorder,
  },
  radio: { borderRadius: radii.pill },
  checkbox: { borderRadius: radii.sm - 3 },
  checked: { borderColor: colors.accent, backgroundColor: colors.accent },
  inner: { width: inner, height: inner, backgroundColor: colors.textOnAccent },
  innerSquare: { borderRadius: borders.thick },
});
