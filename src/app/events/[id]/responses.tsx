import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  Button,
  Card,
  Dialog,
  Divider,
  Icon,
  IconButton,
  PersonRow,
  Screen,
  SegmentedControl,
  TallyRow,
  Tag,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import { loadEventPage, type EventPage } from '@/lib/events';
import {
  answerText,
  loadResponses,
  optionPickers,
  shareResponsesCsv,
  shareResponsesText,
  type EventResponses,
  type GuestResponse,
} from '@/lib/responses';
import { sizes, spacing } from '@/theme/tokens';

type View_ = 'summary' | 'guests';

/**
 * Host's view of the RSVP questionnaire: a per-question summary (tap an option to
 * see who picked it), each guest's answers, flags for answers to "important"
 * questions, and export as text or a spreadsheet (CSV).
 */
export default function ResponsesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, showNotice } = useAuth();
  const userId = session?.user.id;

  const [page, setPage] = useState<EventPage | null>(null);
  const [data, setData] = useState<EventResponses | null>(null);
  const [error, setError] = useState<string>();
  const [view, setView] = useState<View_>('summary');
  const [open, setOpen] = useState<string | null>(null); // expanded option id
  const [guest, setGuest] = useState<GuestResponse | null>(null);
  const [exporting, setExporting] = useState<'text' | 'csv' | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadEventPage(id, userId).then(setPage).catch(() => {});
      loadResponses(id)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the responses.'));
    }, [id, userId]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const backButton = (
    <IconButton
      icon={<Icon name={{ ios: 'chevron.left', android: 'chevron_left' }} size="lg" />}
      onPress={back}
      accessibilityLabel="Back"
      variant="ghost"
    />
  );

  if (page && !page.isHost) {
    return (
      <Screen collapsingHeader={<View style={{ flexDirection: 'row' }}>{backButton}</View>}>
        <Text variant="body" tone="muted">Only the host can see everyone's responses.</Text>
      </Screen>
    );
  }

  const title = page?.title ?? 'Event';
  const going = data?.guests.filter((g) => !g.waitlisted).length ?? 0;
  const waitlist = data?.guests.filter((g) => g.waitlisted).length ?? 0;
  const flagged = data?.guests.filter((g) => g.flags.length) ?? [];

  const exportAs = async (kind: 'text' | 'csv') => {
    if (!data) return;
    setExporting(kind);
    try {
      if (kind === 'text') await shareResponsesText(title, data);
      else await shareResponsesCsv(title, data);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'Could not export the responses.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Screen
      collapsingHeader={<View style={{ flexDirection: 'row' }}>{backButton}</View>}
      footer={
        data?.guests.length ? (
          <>
            <View style={{ flex: 1 }}>
              <Button label="Share as text" variant="secondary" onPress={() => exportAs('text')} loading={exporting === 'text'} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Export spreadsheet" onPress={() => exportAs('csv')} loading={exporting === 'csv'} fullWidth />
            </View>
          </>
        ) : undefined
      }
    >
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Responses</Text>
        <Text variant="body" tone="muted">
          {title}
          {data ? ` · ${going} going${waitlist ? ` · ${waitlist} on the waitlist` : ''}` : ''}
        </Text>
      </View>

      {!data && <Text variant="body" tone={error ? 'danger' : 'muted'}>{error ?? 'Loading…'}</Text>}
      {data && !data.questions.length && <Text variant="body" tone="muted">This event has no questions.</Text>}
      {data && !!data.questions.length && !data.guests.length && (
        <Text variant="body" tone="muted">No responses yet — they appear here as guests RSVP.</Text>
      )}

      {/* C: answers to important questions that need attention */}
      {flagged.length > 0 && (
        <Card tone="sunken">
          <View style={{ gap: spacing.sm }}>
            <Tag label={`Needs attention · ${flagged.length}`} variant="danger" />
            {flagged.map((g) => (
              <Pressable key={g.person.id} onPress={() => setGuest(g)} accessibilityRole="button">
                <Text variant="body" tone="strong">
                  <Text variant="bodyStrong">{g.person.name}</Text> — {g.flags.join('; ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {data && !!data.guests.length && (
        <SegmentedControl
          options={[
            { key: 'summary', label: 'Summary' },
            { key: 'guests', label: `By guest · ${data.guests.length}` },
          ]}
          value={view}
          onChange={setView}
        />
      )}

      {/* B: per question */}
      {data && !!data.guests.length && view === 'summary' &&
        data.questions.map((q) => {
          const answered = data.guests.filter((g) => g.answers[q.id]);
          return (
            <Card key={q.id}>
              <View style={{ gap: spacing.md }}>
                <View style={{ gap: spacing.xs }}>
                  {q.important && <Tag label="Important" variant="danger" />}
                  <Text variant="heading">{q.text}</Text>
                  <Text variant="small" tone="subtle">{`${answered.length} answered`}</Text>
                </View>
                {q.type === 'short'
                  ? answered.map((g) => (
                      <Text key={g.person.id} variant="body" tone="strong">
                        <Text variant="bodyStrong">{g.person.name.split(' ')[0]}</Text> — {g.answers[q.id].text}
                      </Text>
                    ))
                  : optionPickers(q, data.guests).map(({ option, people }) => (
                      <TallyRow
                        key={option.id}
                        label={option.label}
                        count={people.length}
                        total={answered.length}
                        expanded={open === option.id}
                        onPress={() => setOpen(open === option.id ? null : option.id)}
                      >
                        <View style={{ gap: spacing.xs }}>
                          {people.map((g) => {
                            const detail = g.answers[q.id]?.options.find((o) => o.id === option.id)?.detail;
                            return (
                              <Pressable key={g.person.id} onPress={() => setGuest(g)} accessibilityRole="button">
                                <Text variant="small" tone="muted">
                                  {g.person.name}
                                  {detail ? ` — ${detail}` : ''}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </TallyRow>
                    ))}
              </View>
            </Card>
          );
        })}

      {/* A: per guest */}
      {data && !!data.guests.length && view === 'guests' && (
        <View style={{ gap: spacing.sm }}>
          {data.guests.map((g) => (
            <Pressable key={g.person.id} onPress={() => setGuest(g)} accessibilityRole="button" accessibilityLabel={`${g.person.name}'s answers`}>
              <PersonRow
                name={g.person.name}
                avatarUrl={g.person.avatar_url}
                subtitle={g.waitlisted ? 'Waitlist' : g.person.username ? `@${g.person.username}` : undefined}
                action={g.flags.length ? <Tag label="Needs attention" variant="danger" /> : <Text variant="label" tone="subtle">›</Text>}
              />
            </Pressable>
          ))}
        </View>
      )}

      <Dialog
        visible={!!guest}
        onClose={() => setGuest(null)}
        title={guest?.person.name ?? ''}
        actions={<Button label="Done" onPress={() => setGuest(null)} fullWidth />}
      >
        <ScrollView style={{ maxHeight: sizes.guestListMax }} contentContainerStyle={{ gap: spacing.md }}>
          {guest?.waitlisted && <Tag label="On the waitlist" variant="neutral" />}
          {data?.questions.map((q, i) => (
            <View key={q.id} style={{ gap: spacing.xs }}>
              {i > 0 && <Divider />}
              <Text variant="eyebrow">{q.text}</Text>
              <Text variant="body" tone="strong">{guest ? answerText(guest.answers[q.id]) : ''}</Text>
            </View>
          ))}
        </ScrollView>
      </Dialog>
    </Screen>
  );
}
