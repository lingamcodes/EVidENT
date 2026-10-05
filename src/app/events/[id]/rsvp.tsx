import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { AnswerPreview, Button, Card, ChoiceRow, IconButton, Input, Screen, Text } from '@/components';
import { isAllergyOption } from '@/components/questionnaire/types';
import { useAuth } from '@/lib/auth';
import { directionsUrl, loadEventPage, type EventPage } from '@/lib/events';
import { formatEventWhen } from '@/lib/format';
import {
  loadEventSocial,
  loadMyAnswers,
  loadQuestions,
  missingAnswers,
  saveAnswers,
  type Answers,
  type EventSocial,
  type GuestQuestion,
} from '@/lib/rsvp';
import { spacing } from '@/theme/tokens';

/** "You're going" (design 4e): confirmation + the host's questions. Also used to edit answers later. */
export default function RsvpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, showNotice } = useAuth();
  const userId = session?.user.id;

  const [page, setPage] = useState<EventPage | null>(null);
  const [social, setSocial] = useState<EventSocial | null>(null);
  const [questions, setQuestions] = useState<GuestQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    Promise.all([loadEventPage(id, userId), loadEventSocial(id), loadQuestions(id), loadMyAnswers(id, userId)])
      .then(([p, s, q, a]) => {
        setPage(p);
        setSocial(s);
        setQuestions(q);
        setAnswers(a);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this event.'))
      .finally(() => setLoaded(true));
  }, [id, userId]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const answerFor = (qid: string) => answers[qid] ?? { optionIds: [], text: '', optionText: {} };
  const update = (qid: string, next: Partial<Answers[string]>) =>
    setAnswers((all) => ({ ...all, [qid]: { ...answerFor(qid), ...next } }));

  const pick = (q: GuestQuestion, optionId: string) => {
    const current = answerFor(q.id).optionIds;
    if (q.type === 'mc') return update(q.id, { optionIds: [optionId] });
    update(q.id, {
      optionIds: current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId],
    });
  };

  const missing = missingAnswers(questions, answers);

  const submit = async () => {
    setAttempted(true);
    if (missing) return setError(`Answer the ${missing === 1 ? 'remaining question' : `${missing} remaining questions`} first.`);
    setSaving(true);
    setError(undefined);
    try {
      await saveAnswers(id, questions, answers);
      showNotice('Answers sent to the host.');
      back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answers.');
      setSaving(false);
    }
  };

  if (!page || !social) {
    return (
      <Screen>
        <IconButton icon={<Text variant="heading">‹</Text>} onPress={back} accessibilityLabel="Back" variant="ghost" />
        <Text variant="body" tone={error ? 'danger' : 'muted'}>{error ?? (loaded ? 'This event is not available.' : 'Loading…')}</Text>
      </Screen>
    );
  }

  const when = formatEventWhen(page.dateTime, page.endsAt);
  const directions = directionsUrl(page);
  const waitlisted = social.my_status === 'yes' && social.my_waitlist_rank > 0;
  const heading = social.my_status === 'yes' ? (waitlisted ? "You're on the waitlist" : "You're going") : 'Your answers';
  const intro = waitlisted
    ? `You're #${social.my_waitlist_rank} on the waitlist — you'll get a spot if someone drops out.`
    : questions.length
      ? `Your spot is saved. Answer a few questions from ${page.host.name.split(' ')[0]} below.`
      : 'Your spot is saved. See you there.';

  return (
    <Screen
      footer={
        questions.length ? (
          <View style={{ flex: 1 }}>
            <Button label="Submit answers" onPress={submit} loading={saving} fullWidth />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Button label="Done" onPress={back} fullWidth />
          </View>
        )
      }
    >
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={back} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{heading}</Text>
        <Text variant="body" tone="muted">{intro}</Text>
      </View>

      <Card>
        <View style={{ gap: spacing.md }}>
          <Text variant="cardTitle">{page.title}</Text>
          <View style={{ gap: spacing.xxs }}>
            <Text variant="eyebrow">When</Text>
            <Text variant="bodyStrong">{when.date}</Text>
            {!!when.time && <Text variant="small" tone="muted">{when.time}</Text>}
          </View>
          <View style={{ gap: spacing.xxs }}>
            <Text variant="eyebrow">Where</Text>
            <Text variant="bodyStrong">{page.location || 'Place to be confirmed'}</Text>
          </View>
          {directions && (
            <View style={{ alignItems: 'flex-start' }}>
              <Button label="Directions" variant="secondary" size="sm" onPress={() => Linking.openURL(directions)} />
            </View>
          )}
        </View>
      </Card>

      {questions.length > 0 && (
        <View style={{ gap: spacing.lg }}>
          <Text variant="heading">A few questions from {page.host.name.split(' ')[0]}</Text>
          {questions.map((q) => {
            const a = answerFor(q.id);
            const unanswered = attempted && (q.type === 'short' ? !a.text.trim() : !a.optionIds.length);
            return (
              <View key={q.id} style={{ gap: spacing.sm }}>
                <View style={{ gap: spacing.xxs }}>
                  <Text variant="label">{q.text}</Text>
                  <Text variant="caption">
                    {q.type === 'mc' ? 'Multiple choice · pick one' : q.type === 'check' ? 'Checkbox · pick any' : 'Short text'}
                  </Text>
                </View>

                {q.type === 'short' ? (
                  <Input
                    value={a.text}
                    onChangeText={(text) => update(q.id, { text })}
                    placeholder="Your answer"
                    error={unanswered ? 'Please answer this' : undefined}
                  />
                ) : (
                  <>
                    {q.options.map((o) => {
                      const selected = a.optionIds.includes(o.id);
                      return (
                        <View key={o.id} style={{ gap: spacing.xs }}>
                          <ChoiceRow
                            selected={selected}
                            onPress={() => pick(q, o.id)}
                            marker={q.type === 'check' ? 'checkbox' : 'radio'}
                          >
                            <Text variant="label">{o.label}</Text>
                          </ChoiceRow>
                          {selected && isAllergyOption(o.label) && (
                            <Input
                              size="sm"
                              value={a.optionText[o.id] ?? ''}
                              onChangeText={(t) => update(q.id, { optionText: { ...a.optionText, [o.id]: t } })}
                              placeholder="List your allergies"
                            />
                          )}
                        </View>
                      );
                    })}
                    {unanswered && <Text variant="small" tone="danger">Pick an option</Text>}
                  </>
                )}
              </View>
            );
          })}
          <AnswerPreview label="Only the host sees your answers." />
        </View>
      )}

      {error && <Text variant="small" tone="danger">{error}</Text>}
    </Screen>
  );
}
