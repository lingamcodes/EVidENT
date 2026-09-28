/**
 * DEV ONLY — component gallery for checking the design on-device.
 * Delete this file and its tab in app-tabs.tsx before shipping.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import {
  ActivityRow,
  AddTile,
  AnswerPreview,
  Avatar,
  AvatarStack,
  Bold,
  Button,
  Card,
  Chip,
  ChoiceMarker,
  Dialog,
  Divider,
  EventCard,
  IconButton,
  Input,
  QuestionnaireSection,
  questionTypes,
  Screen,
  SectionHeader,
  SegmentedControl,
  StepProgress,
  Tabs,
  Tag,
  Text,
  type Question,
  type QuestionType,
} from '@/components';
import { sizes, spacing } from '@/theme/tokens';

const noop = () => {};

const people = [
  { id: '1', name: 'Rachel Tan' },
  { id: '2', name: 'Dev Kumar' },
  { id: '3', name: 'Mei Chandra' },
];

export default function ComponentGallery() {
  const [rsvp, setRsvp] = useState(false);
  const [tab, setTab] = useState<'friends' | 'invites'>('friends');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [filter, setFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>('mc');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [photoOn, setPhotoOn] = useState(false);

  return (
    <Screen>
      <Section title="Typography">
        <Text variant="display">Display</Text>
        <Text variant="title">Title — Hey Mei</Text>
        <Text variant="heading">Heading</Text>
        <Text variant="cardTitle">Card title — Golden hour 5k</Text>
        <Text variant="body">Body — You need a name and a way to be reached.</Text>
        <Text variant="small" tone="muted">Small, muted</Text>
        <Text variant="caption">Caption — 12 min ago</Text>
        <Text variant="meta">Meta — Today · 6.45pm · East Coast Park</Text>
        <Text variant="eyebrow">Eyebrow label</Text>
      </Section>

      <Section title="Buttons">
        <Button label="Continue" onPress={noop} fullWidth />
        <Button label="Continue with Google" onPress={noop} variant="secondary" fullWidth />
        <Button
          label={rsvp ? "You're going" : "I'm going"}
          variant={rsvp ? 'soft' : 'primary'}
          onPress={() => setRsvp(!rsvp)}
          fullWidth
        />
        <Row>
          <Button label="See all" onPress={noop} variant="ghost" />
          <Button label="+ Add photos" onPress={noop} variant="secondary" size="sm" />
          <Button label="Follow" onPress={noop} size="sm" />
        </Row>
        <Row>
          <Button label="Loading" onPress={noop} loading />
          <Button label="Disabled" onPress={noop} disabled />
          <Button label="Delete" onPress={noop} variant="danger" size="sm" />
        </Row>
        <Row>
          <Button label="+ Add option" onPress={noop} variant="outline" size="sm" />
          <Button label="Delete question" onPress={noop} variant="dangerSoft" size="sm" />
          <Button label="Remove all" onPress={noop} variant="dangerSoft" size="xs" />
        </Row>
      </Section>

      <Section title="Icon buttons">
        <Row>
          <IconButton icon={<Text variant="heading">‹</Text>} onPress={noop} accessibilityLabel="Back" />
          <IconButton icon={<Text variant="heading">•</Text>} onPress={noop} accessibilityLabel="Notifications" showBadge />
          <IconButton icon={<Text variant="heading" tone="accent">↗</Text>} onPress={noop} accessibilityLabel="Share" variant="outline" />
          <IconButton icon={<Text variant="heading">×</Text>} onPress={noop} accessibilityLabel="Close" variant="ghost" size="sm" />
        </Row>
        <Row>
          <IconButton
            icon={<Text variant="label" tone={photoOn ? 'accent' : 'muted'}>▣</Text>}
            onPress={() => setPhotoOn(!photoOn)}
            accessibilityLabel="Toggle photo"
            variant="bordered"
            size="sm"
            selected={photoOn}
          />
          <IconButton icon={<Text variant="label" tone="subtle">×</Text>} onPress={noop} accessibilityLabel="Remove" variant="bordered" size="xs" />
          <Text variant="small" tone="muted">Bordered: tap the first to toggle selected</Text>
        </Row>
      </Section>

      <Section title="Inputs">
        <Input label="Your name" placeholder="Mei Chandra" />
        <Input label="Username" prefix="@" placeholder="meiruns" success="Available" />
        <Input label="Mobile or email" placeholder="+65 9123 4567" hint="We text a 6-digit code." />
        <Input label="Event title" placeholder="Title" error="Give your event a name" />
        <Input label="Description" placeholder="What's the plan?" multiline />
        <Input size="sm" placeholder="Compact (size sm) — question & option fields" />
      </Section>

      <Section title="Question type picker">
        <Text variant="small" tone="muted">Stretched chips share the row equally. Tap to switch the preview.</Text>
        <Row stretch>
          {questionTypes.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              selected={questionType === t.key}
              onPress={() => setQuestionType(t.key)}
              stretch
            />
          ))}
        </Row>
        {questionType === 'short' ? (
          <AnswerPreview label="Guests type their answer here" />
        ) : (
          ['Vegetarian', 'Halal', 'Allergies'].map((label) => (
            <Row key={label}>
              <ChoiceMarker shape={questionType === 'check' ? 'checkbox' : 'radio'} />
              <Text variant="body">{label}</Text>
            </Row>
          ))
        )}
        <Text variant="eyebrow">Compare: normal chips (sized to their text)</Text>
        <Row>
          {['All', 'People', 'Orgs', 'Events'].map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </Row>
      </Section>

      <Section title="Choice markers">
        <Row>
          <ChoiceMarker shape="radio" />
          <ChoiceMarker shape="radio" checked />
          <ChoiceMarker shape="checkbox" />
          <ChoiceMarker shape="checkbox" checked />
          <Text variant="small" tone="muted">radio · checked · checkbox · checked</Text>
        </Row>
        <AnswerPreview label="Guests type their answer here" />
        <AnswerPreview label="Guests list their allergies here" dashed />
      </Section>

      <Section title="Add tiles">
        <AddTile title="+ Add questionnaire" subtitle="ask guests what you need to know when they accept" filled onPress={noop} />
        <AddTile title="+ Add cover photo" subtitle="shows on the org profile card" height={sizes.eventCard.imageHeight} onPress={noop} />
      </Section>

      <Section title="Questionnaire">
        <Text variant="small" tone="muted">The full 5b section. Try adding, editing and deleting.</Text>
        <QuestionnaireSection questions={questions} onChange={setQuestions} />
      </Section>

      <Section title="Tags & chips">
        <Row>
          <Tag label="Accent" variant="accent" />
          <Tag label="Secondary" variant="secondary" />
          <Tag label="Neutral" />
          <Tag label="Outline" variant="outline" />
        </Row>
        <Row>
          {['All', 'People', 'Orgs', 'Events'].map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </Row>
      </Section>

      <Section title="Avatars">
        <Row>
          <Avatar name="Mei" size="xs" />
          <Avatar name="Mei" size="sm" />
          <Avatar name="Mei" size="md" />
          <Avatar name="Mei" size="lg" />
          <Avatar name="Sundown Runners" size="xl" />
        </Row>
        <AvatarStack people={people} label="Rachel and 12 others you follow" />
      </Section>

      <Section title="Navigation">
        <Tabs
          tabs={[
            { key: 'friends', label: 'Friends' },
            { key: 'invites', label: 'Invites · 3' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <SegmentedControl
          options={[
            { key: 'public', label: 'Public' },
            { key: 'private', label: 'Private' },
          ]}
          value={visibility}
          onChange={setVisibility}
        />
        <StepProgress total={3} current={1} />
        <Divider label="or" />
        <Divider />
      </Section>

      <Section title="Cards">
        <SectionHeader title="You're going" actionLabel="See all" onAction={noop} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          <EventCard title="Golden hour 5k + laksa" meta="Today · 6.45pm · East Coast Park · 43 going" badge="in 4 hrs" onPress={noop} />
          <EventCard title="Kopi + cards night" meta="Sun 24 Aug · 9 going · 4 pending" actionLabel="Manage" onAction={noop} onPress={noop} />
        </ScrollView>
        <ActivityRow time="12 min ago" onPress={noop}>
          <Bold>Rachel Tan</Bold> is going to <Bold>Golden hour 5k + laksa</Bold>
        </ActivityRow>
        <ActivityRow time="Yesterday" thumbShape="circle">
          <Bold>Sam Ho</Bold> followed <Bold>Sundown Runners</Bold>
        </ActivityRow>
        <Card>
          <Text variant="body">Plain card with padding.</Text>
        </Card>
        <Card tone="sunken">
          <Text variant="body">Sunken card (tone="sunken").</Text>
        </Card>
      </Section>

      <Section title="Dialog">
        <Button label="Open dialog" onPress={() => setDialogOpen(true)} variant="secondary" />
        <Dialog
          visible={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Cancel this event?"
          message="Everyone who RSVPed gets a notification."
          actions={
            <>
              <Button label="Keep it" variant="secondary" size="sm" onPress={() => setDialogOpen(false)} />
              <Button label="Cancel event" variant="danger" size="sm" onPress={() => setDialogOpen(false)} />
            </>
          }
        />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

function Row({ children, stretch = false }: { children: ReactNode; stretch?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: stretch ? 'nowrap' : 'wrap', alignItems: 'center', gap: spacing.sm }}>
      {children}
    </View>
  );
}
