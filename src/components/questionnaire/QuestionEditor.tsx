import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme/tokens';
import { AddTile } from '../AddTile';
import { AnswerPreview } from '../AnswerPreview';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { ChoiceMarker } from '../ChoiceMarker';
import { IconButton } from '../IconButton';
import { Input } from '../Input';
import { Text } from '../Text';
import { isAllergyOption, newOption, questionTypes, type Question } from './types';

type Props = {
  question: Question;
  onChange: (next: Question) => void;
  onDelete: () => void;
};

/** One editable question card in the host's questionnaire builder. */
export function QuestionEditor({ question, onChange, onDelete }: Props) {
  const update = (patch: Partial<Question>) => onChange({ ...question, ...patch });
  const { options } = question;

  return (
    <Card>
      <View style={styles.stack}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              size="sm"
              value={question.text}
              onChangeText={(text) => update({ text })}
              placeholder="Question"
              accessibilityLabel="Question"
            />
          </View>
          <IconButton
            icon={<Text variant="label" tone={question.hasPhoto ? 'accent' : 'muted'}>▣</Text>}
            onPress={() => update({ hasPhoto: !question.hasPhoto })}
            accessibilityLabel={question.hasPhoto ? 'Remove question photo' : 'Add question photo'}
            variant="bordered"
            size="sm"
            selected={question.hasPhoto}
          />
        </View>

        <View style={styles.row} accessibilityRole="radiogroup">
          {questionTypes.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              selected={question.type === t.key}
              onPress={() => update({ type: t.key })}
              stretch
            />
          ))}
        </View>

        {question.hasPhoto && (
          <AddTile title="+ Add photo" subtitle="shown above the question" height={sizes.questionPhoto} onPress={() => {}} />
        )}

        {question.type === 'short' ? (
          <AnswerPreview label="Guests type their answer here" />
        ) : (
          <View style={styles.options}>
            {options.map((opt, i) => (
              <View key={opt.id} style={styles.optionBlock}>
                <View style={styles.optionRow}>
                  <ChoiceMarker shape={question.type === 'check' ? 'checkbox' : 'radio'} />
                  <View style={styles.flex}>
                    <Input
                      size="sm"
                      value={opt.label}
                      onChangeText={(label) =>
                        update({ options: options.map((o, j) => (j === i ? { ...o, label } : o)) })
                      }
                      placeholder="Option"
                      accessibilityLabel={`Option ${i + 1}`}
                    />
                  </View>
                  <IconButton
                    icon={<Text variant="label" tone="subtle">×</Text>}
                    onPress={() => update({ options: options.filter((o) => o.id !== opt.id) })}
                    accessibilityLabel={`Remove option ${opt.label || i + 1}`}
                    variant="bordered"
                    size="xs"
                  />
                </View>
                {isAllergyOption(opt.label) && (
                  <View style={styles.followUp}>
                    <AnswerPreview label="Guests list their allergies here" dashed />
                  </View>
                )}
              </View>
            ))}
            <View style={styles.start}>
              <Button
                label="+ Add option"
                variant="outline"
                size="sm"
                onPress={() => update({ options: [...options, newOption('New option')] })}
              />
            </View>
          </View>
        )}

        <Button label="Delete question" variant="dangerSoft" size="sm" fullWidth onPress={onDelete} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md - 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 1 },
  flex: { flex: 1 },
  options: { gap: spacing.sm },
  optionBlock: { gap: spacing.xs + 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  followUp: { marginLeft: sizes.choiceMarker + spacing.sm },
  start: { alignItems: 'flex-start' },
});
