import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { AnswerPreview, Button, Card, ChoiceRow, Dialog, IconButton, Input, Screen, Text } from '@/components';
import { isAllergyOption } from '@/components/questionnaire/types';
import { useAuth } from '@/lib/auth';
import { directionsUrl, loadEventPage, type EventPage } from '@/lib/events';
import { formatEventWhen } from '@/lib/format';
import {
  loadEventSocial,
  loadMyAnswers,
  loadQuestions,
  missingAnswers,
  rsvpWithAnswers,
  saveAnswers,
  setRsvp,
  type Answers,
  type EventSocial,
  type GuestQuestion,
} from '@/lib/rsvp';
import { spacing } from '@/theme/tokens';

/**
 * The host's questionnaire (design 4e). Not going yet → answering + "Confirm" is what
 * makes you going (or waitlisted). Already going → edit your answers.
 */
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
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

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

  const confirming = social?.my_status !== 'yes';

  /** Can't make it after all: records "can't go" (the host sees it) and frees the spot. */
  const leave = async () => {
    setLeaving(true);
    try {
      await setRsvp(id, 'no');
      setConfirmLeave(false);
      showNotice(`You left ${page?.title ?? 'the event'}.`);
      back();
    } catch (e) {
      setConfirmLeave(false);
      setError(e instanceof Error ? e.message : 'Could not leave the event.');
      setLeaving(false);
    }
  };

  const submit = async () => {
    setAttempted(true);
    if (missing) return setError(`Answer the ${missing === 1 ? 'remaining question' : `${missing} remaining questions`} first.`);
    setSaving(true);
    setError(undefined);
    try {
      if (confirming) {
        const result = questions.length ? await rsvpWithAnswers(id, questions, answers) : await setRsvp(id, 'yes');
        showNotice(
          result.waitlisted
            ? `The event is full — you're #${result.waitlist_rank} on the waitlist. Your answers are saved.`
            : "You're going! Your answers went to the host.",
        );
      } else {
        await saveAnswers(id, questions, answers);
        showNotice('Answers updated.');
      }
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
  const hostFirst = page.host.name.split(' ')[0];
  const heading = confirming ? 'Almost there' : waitlisted ? "You're on the waitlist" : "You're going";
  const intro = confirming
    ? `Answer ${hostFirst}'s questions to confirm your spot. You're not on the guest list until you submit.`
    : waitlisted
      ? `You're #${social.my_waitlist_rank} on the waitlist — you'll get a spot if someone drops out.`
      : 'Your spot is saved. You can update your answers here.';
  const submitLabel = confirming ? "Confirm — I'm going" : 'Save answers';

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: spacing.sm }}>
          {questions.length || confirming ? (
            <Button label={submitLabel} onPress={submit} loading={saving} disabled={confirming && !social.rsvp_open} fullWidth />
          ) : (
            <Button label="Done" onPress={back} fullWidth />
          )}
          {!confirming && (
            <Button label="Leave event" variant="dangerSoft" onPress={() => setConfirmLeave(true)} disabled={saving || leaving} fullWidth />
          )}
        </View>
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
          <Text variant="heading">A few questions from {hostFirst}</Text>
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

      <Dialog
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave this event?"
        message={
          social.waitlist_count
            ? 'Your spot goes to the next person on the waitlist.'
            : "The host will see that you can't make it."
        }
        actions={
          <>
            <Button label="Stay" variant="secondary" size="sm" onPress={() => setConfirmLeave(false)} />
            <Button label="Leave event" variant="danger" size="sm" onPress={leave} loading={leaving} />
          </>
        }
      />
    </Screen>
  );
}
