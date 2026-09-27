import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AddTile } from '../AddTile';
import { Button } from '../Button';
import { Card } from '../Card';
import { Text } from '../Text';
import { QuestionEditor } from './QuestionEditor';
import { defaultQuestions, newQuestion, type Question } from './types';

type Props = {
  /** null = no questionnaire on this event. */
  questions: Question[] | null;
  onChange: (next: Question[] | null) => void;
};

/** Create-event "Questionnaire" block: ask guests what you need to know when they accept. */
export function QuestionnaireSection({ questions, onChange }: Props) {
  const enabled = questions !== null;

  return (
    <Card tone="sunken">
      <View style={styles.stack}>
        <View style={styles.header}>
          <Text variant="eyebrow" accessibilityRole="header">Questionnaire</Text>
          {enabled && <Button label="Remove all" variant="dangerSoft" size="xs" onPress={() => onChange(null)} />}
        </View>

        {!enabled ? (
          <AddTile
            title="+ Add questionnaire"
            subtitle="ask guests what you need to know when they accept"
            filled
            onPress={() => onChange(defaultQuestions())}
          />
        ) : (
          <>
            {questions.map((q) => (
              <QuestionEditor
                key={q.id}
                question={q}
                onChange={(next) => onChange(questions.map((x) => (x.id === q.id ? next : x)))}
                onDelete={() => onChange(questions.filter((x) => x.id !== q.id))}
              />
            ))}
            <Button
              label="+ Add question"
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => onChange([...questions, newQuestion()])}
            />
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md - 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
