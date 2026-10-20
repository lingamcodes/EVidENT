import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate, formatTime } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Input } from './Input';

type Props = {
  mode: 'date' | 'time';
  value: Date | null;
  onChange: (next: Date) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  size?: 'md' | 'sm';
  /** Earliest selectable day (date mode) or time of day (time mode). */
  minimumDate?: Date;
  /** Latest selectable day (date mode) or time of day (time mode). */
  maximumDate?: Date;
};

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
/** `time`'s hours and minutes on `day`'s date. */
const onDay = (day: Date, time: Date) => {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
};

/** Input-looking field that opens the phone's native date or time picker. */
export function DateTimeField({ mode, value, onChange, label, placeholder, error, hint, size, minimumDate, maximumDate }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const insets = useSafeAreaInsets();

  // Time mode compares time of day only. iOS's spinner enforces the limits itself
  // (they're moved onto the picker's day); Android's clock can't, so picks are clamped.
  const clamp = (d: Date) => {
    if (mode !== 'time') return d;
    if (minimumDate && minutesOf(d) < minutesOf(minimumDate)) return onDay(d, minimumDate);
    if (maximumDate && minutesOf(d) > minutesOf(maximumDate)) return onDay(d, maximumDate);
    return d;
  };
  const limit = (d: Date | undefined) => (d && mode === 'time' ? onDay(draft, d) : d);

  const open = () => {
    const start = clamp(value ?? new Date());
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode,
        // Android's clock has no time limits (clamped below); its calendar does.
        minimumDate: mode === 'date' ? minimumDate : undefined,
        maximumDate: mode === 'date' ? maximumDate : undefined,
        is24Hour: false,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(clamp(picked));
        },
      });
    } else {
      setDraft(start);
      setIosOpen(true);
    }
  };

  const text = value ? (mode === 'date' ? formatDate(value) : formatTime(value)) : '';

  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={label ?? placeholder}>
        <Input
          label={label}
          value={text}
          placeholder={placeholder ?? (mode === 'date' ? 'Pick a date' : 'Pick a time')}
          error={error}
          hint={hint}
          size={size}
          picker
        />
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.scrim} onPress={() => setIosOpen(false)} accessibilityLabel="Close picker" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              minimumDate={limit(minimumDate)}
              maximumDate={limit(maximumDate)}
              onChange={(_e, picked) => picked && setDraft(picked)}
              textColor={colors.text}
              accentColor={colors.accent}
            />
            <Button
              label="Done"
              onPress={() => {
                onChange(clamp(draft));
                setIosOpen(false);
              }}
              fullWidth
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.lg,
  },
});
