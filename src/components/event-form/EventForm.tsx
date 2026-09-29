import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import {
  deleteEvent,
  inviteLink,
  loadFollowing,
  pickAndUploadCover,
  saveEvent,
  validateForPublish,
  type EventForm as Form,
  type FormErrors,
  type Person,
} from '@/lib/events';
import { formatDate } from '@/lib/format';
import { radii, sizes, spacing } from '@/theme/tokens';
import { AddTile } from '../AddTile';
import { Button } from '../Button';
import { ChoiceMarker } from '../ChoiceMarker';
import { ChoiceRow } from '../ChoiceRow';
import { DateTimeField } from '../DateTimeField';
import { Dialog } from '../Dialog';
import { Divider } from '../Divider';
import { IconButton } from '../IconButton';
import { Input } from '../Input';
import { OptionCard } from '../OptionCard';
import { PersonChip } from '../PersonChip';
import { PersonRow } from '../PersonRow';
import { QuestionnaireSection } from '../questionnaire/QuestionnaireSection';
import { Screen } from '../Screen';
import { Text } from '../Text';
import { Toggle } from '../Toggle';

type Props = {
  initial: Form;
};

/** Create / edit event (design 5b). Saves itself; closes back to where it was opened from. */
export function EventForm({ initial }: Props) {
  const { session, showNotice } = useAuth();
  const userId = session?.user.id;
  const editing = !!initial.id;

  const [form, setForm] = useState<Form>(initial);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const errors: FormErrors = useMemo(() => (attempted ? validateForPublish(form) : {}), [attempted, form]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const addCover = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      const url = await pickAndUploadCover(userId);
      if (url) set('coverUrl', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (status: 'draft' | 'published') => {
    if (!userId) return;
    setError(undefined);
    if (status === 'published') {
      setAttempted(true);
      if (Object.keys(validateForPublish(form)).length) {
        setError('Fix the highlighted fields to publish.');
        return;
      }
    } else if (!form.title.trim()) {
      setAttempted(true);
      setError('A draft needs at least a title.');
      return;
    }
    setSaving(status);
    try {
      await saveEvent(form, status, userId);
      showNotice(status === 'published' ? `"${form.title.trim()}" is live.` : 'Draft saved.');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the event.');
      setSaving(null);
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteEvent(form.id);
      setConfirmDelete(false);
      showNotice('Event deleted.');
      close();
    } catch (e) {
      setConfirmDelete(false);
      setError(e instanceof Error ? e.message : 'Could not delete the event.');
    }
  };

  const shareInvite = async () => {
    if (!form.inviteCode) return;
    await Share.share({
      message: `You're invited to ${form.title.trim() || 'my event'} on Evident: ${inviteLink(form.inviteCode)}`,
    });
  };
  const canShare = !!form.inviteCode && initial.status === 'published';

  return (
    <Screen
      footer={
        <>
          <View style={styles.flex}>
            <Button label="Publish" onPress={() => save('published')} loading={saving === 'published'} disabled={!!saving} fullWidth />
          </View>
          <Button label="Save draft" variant="secondary" onPress={() => save('draft')} loading={saving === 'draft'} disabled={!!saving} />
          {editing && <Button label="Delete" variant="dangerSoft" onPress={() => setConfirmDelete(true)} disabled={!!saving} />}
        </>
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={<Text variant="heading">‹</Text>} onPress={close} accessibilityLabel="Back" variant="ghost" />
        <Text variant="label" tone="muted">{editing ? 'Edit event' : 'New event'}</Text>
        <IconButton icon={<Text variant="heading">×</Text>} onPress={close} accessibilityLabel="Close" variant="ghost" />
      </View>

      <Input
        size="title"
        value={form.title}
        onChangeText={(v) => set('title', v)}
        placeholder="Event title"
        error={errors.title}
        accessibilityLabel="Event title"
      />

      {/* Cover */}
      {form.coverUrl ? (
        <View style={styles.stack}>
          <Image source={{ uri: form.coverUrl }} style={styles.cover} contentFit="cover" accessibilityLabel="Cover photo" />
          <Button label="Change cover" variant="secondary" size="sm" onPress={addCover} loading={uploading} />
        </View>
      ) : (
        <AddTile
          title={uploading ? 'Uploading…' : '+ Add cover photo'}
          subtitle="shows on the event card and invite link"
          height={sizes.coverImage}
          onPress={addCover}
        />
      )}

      <Divider />

      {/* When */}
      <View style={styles.stack}>
        <View style={styles.spread}>
          <Text variant="eyebrow">When</Text>
          <Toggle label="Multiple days" value={form.multiDay} onChange={(v) => set('multiDay', v)} />
        </View>
        {form.multiDay ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <DateTimeField mode="date" value={form.startDate} onChange={(d) => set('startDate', d)} placeholder="Start date" size="sm" />
            </View>
            <Text variant="label" tone="subtle">—</Text>
            <View style={styles.flex}>
              <DateTimeField mode="date" value={form.endDate} onChange={(d) => set('endDate', d)} placeholder="End date" size="sm" minimumDate={form.startDate ?? undefined} />
            </View>
          </View>
        ) : (
          <DateTimeField mode="date" value={form.startDate} onChange={(d) => set('startDate', d)} placeholder="Date" />
        )}
        <View style={styles.row}>
          <View style={styles.flex}>
            <DateTimeField mode="time" value={form.startTime} onChange={(d) => set('startTime', d)} placeholder="Starts" />
          </View>
          <Text variant="label" tone="subtle">—</Text>
          <View style={styles.flex}>
            <DateTimeField mode="time" value={form.endTime} onChange={(d) => set('endTime', d)} placeholder="Ends" />
          </View>
        </View>
        {(errors.start || errors.end) && <Text variant="small" tone="danger">{errors.start ?? errors.end}</Text>}
      </View>

      <Divider />

      {/* RSVP by */}
      <View style={styles.stack}>
        <View style={styles.spread}>
          <Text variant="eyebrow">RSVP by (optional)</Text>
          <Toggle value={form.rsvpByOn} onChange={(v) => set('rsvpByOn', v)} accessibilityLabel="RSVP deadline" />
        </View>
        {form.rsvpByOn ? (
          <>
            <View style={styles.row}>
              <View style={styles.flex}>
                <DateTimeField mode="date" value={form.rsvpByDate} onChange={(d) => set('rsvpByDate', d)} placeholder="Date" size="sm" />
              </View>
              <View style={styles.flex}>
                <DateTimeField mode="time" value={form.rsvpByTime} onChange={(d) => set('rsvpByTime', d)} placeholder="Time" size="sm" />
              </View>
            </View>
            <Text variant="small" tone={errors.rsvpBy ? 'danger' : 'subtle'}>
              {errors.rsvpBy ?? `Must fall before the start date${form.startDate ? ` — ${formatDate(form.startDate)}` : ''}.`}
            </Text>
          </>
        ) : (
          <Text variant="small" tone="subtle">RSVPs stay open until the event starts.</Text>
        )}
      </View>

      <Divider />

      {/* Where */}
      <View style={styles.stack}>
        <Text variant="eyebrow">Where</Text>
        <Input value={form.location} onChangeText={(v) => set('location', v)} placeholder="Address or place" error={errors.location} />
        <Input
          size="sm"
          value={form.mapLink}
          onChangeText={(v) => set('mapLink', v)}
          placeholder="Map or venue link (opens from Directions)"
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <Divider />

      {/* Who can see this */}
      <View style={styles.stack}>
        <Text variant="eyebrow">Who can see this</Text>
        <View style={styles.row}>
          <OptionCard
            title="Public"
            subtitle="Anyone can find it on your profile"
            selected={form.visibility === 'public'}
            onPress={() => set('visibility', 'public')}
          />
          <OptionCard
            title="Private"
            subtitle="Invite only, hidden from profile"
            selected={form.visibility === 'private'}
            onPress={() => set('visibility', 'private')}
          />
        </View>

        {form.visibility === 'public' ? (
          <View style={styles.stack}>
            <Text variant="eyebrow">No. of pax</Text>
            <ChoiceRow selected={form.capacityMode === 'limit'} onPress={() => set('capacityMode', 'limit')} accessibilityLabel="Set a limit">
              <View style={styles.flex}>
                <Input
                  size="sm"
                  value={form.capacity}
                  onChangeText={(v) => setForm((f) => ({ ...f, capacity: v.replace(/\D/g, ''), capacityMode: 'limit' }))}
                  onFocus={() => set('capacityMode', 'limit')}
                  placeholder="Set a limit"
                  keyboardType="number-pad"
                />
              </View>
              <Text variant="label" tone="muted">max</Text>
            </ChoiceRow>
            <ChoiceRow selected={form.capacityMode === 'unlimited'} onPress={() => set('capacityMode', 'unlimited')}>
              <Text variant="bodyStrong">Unlimited</Text>
            </ChoiceRow>
            {errors.capacity && <Text variant="small" tone="danger">{errors.capacity}</Text>}
          </View>
        ) : (
          <View style={styles.stack}>
            {form.invitees.length > 0 && (
              <View style={styles.wrap}>
                {form.invitees.map((p) => (
                  <PersonChip
                    key={p.id}
                    name={p.name}
                    avatarUrl={p.avatar_url}
                    onRemove={() => set('invitees', form.invitees.filter((x) => x.id !== p.id))}
                  />
                ))}
              </View>
            )}
            <Button
              label={form.invitees.length ? `Invite friends · ${form.invitees.length}` : 'Invite friends'}
              variant="secondary"
              onPress={() => setInviteOpen(true)}
              fullWidth
            />
            <Button label="Share invite link" variant="outline" onPress={shareInvite} disabled={!canShare} fullWidth />
            {!canShare && (
              <Text variant="small" tone="subtle">Publish first — then anyone with the link can see the event and join.</Text>
            )}
            <View style={styles.spread}>
              <Text variant="label" tone="strong">Allow others to invite</Text>
              <Toggle value={form.allowGuestInvites} onChange={(v) => set('allowGuestInvites', v)} accessibilityLabel="Allow others to invite" />
            </View>
            {form.allowGuestInvites && (
              <View style={styles.spread}>
                <Text variant="label" tone="strong">Maximum no. of pax</Text>
                <View style={styles.paxInput}>
                  <Input
                    size="sm"
                    value={form.maxPax}
                    onChangeText={(v) => set('maxPax', v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    placeholder="30"
                    accessibilityLabel="Maximum number of guests"
                  />
                </View>
              </View>
            )}
            {errors.capacity && <Text variant="small" tone="danger">{errors.capacity}</Text>}
          </View>
        )}
      </View>

      <Divider />

      <View style={styles.stack}>
        <QuestionnaireSection questions={form.questions} onChange={(q) => set('questions', q)} />
        {errors.questions && <Text variant="small" tone="danger">{errors.questions}</Text>}
      </View>

      <Input
        value={form.notes}
        onChangeText={(v) => set('notes', v)}
        placeholder="Additional notes…"
        multiline
        accessibilityLabel="Additional notes"
      />

      {error && <Text variant="small" tone="danger">{error}</Text>}

      <InviteDialog
        visible={inviteOpen}
        userId={userId}
        selected={form.invitees}
        onDone={(people) => {
          set('invitees', people);
          setInviteOpen(false);
        }}
        onClose={() => setInviteOpen(false)}
      />

      <Dialog
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this event?"
        message="Its questionnaire answers and invites go too. This can't be undone."
        actions={
          <>
            <Button label="Keep it" variant="secondary" size="sm" onPress={() => setConfirmDelete(false)} />
            <Button label="Delete event" variant="danger" size="sm" onPress={remove} />
          </>
        }
      />
    </Screen>
  );
}

/** "Invite friends": search the people you follow and tick who to invite. */
function InviteDialog({
  visible,
  userId,
  selected,
  onDone,
  onClose,
}: {
  visible: boolean;
  userId?: string;
  selected: Person[];
  onDone: (people: Person[]) => void;
  onClose: () => void;
}) {
  const [following, setFollowing] = useState<Person[] | null>(null);
  const [picked, setPicked] = useState<Person[]>(selected);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPicked(selected);
    setQuery('');
    if (userId && following === null) loadFollowing(userId).then(setFollowing).catch(() => setFollowing([]));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const shown = (following ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q),
  );
  const isPicked = (id: string) => picked.some((p) => p.id === id);
  const toggle = (p: Person) => setPicked(isPicked(p.id) ? picked.filter((x) => x.id !== p.id) : [...picked, p]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Invite friends"
      actions={<Button label={picked.length ? `Done · ${picked.length}` : 'Done'} onPress={() => onDone(picked)} fullWidth />}
    >
      <Input size="sm" value={query} onChangeText={setQuery} placeholder="Search people you follow" autoCapitalize="none" />
      <ScrollView style={styles.dialogList} contentContainerStyle={styles.stack}>
        {following === null && <Text variant="small" tone="muted">Loading…</Text>}
        {following?.length === 0 && (
          <Text variant="small" tone="muted">You don't follow anyone yet. Share the invite link instead.</Text>
        )}
        {shown.map((p) => (
          <Pressable key={p.id} onPress={() => toggle(p)} accessibilityRole="checkbox" accessibilityState={{ checked: isPicked(p.id) }}>
            <PersonRow
              name={p.name}
              avatarUrl={p.avatar_url}
              subtitle={p.username ? `@${p.username}` : undefined}
              action={<ChoiceMarker shape="checkbox" checked={isPicked(p.id)} />}
            />
          </Pressable>
        ))}
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stack: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  flex: { flex: 1 },
  cover: { width: '100%', height: sizes.coverImage, borderRadius: radii.lg },
  paxInput: { width: sizes.paxInput },
  dialogList: { maxHeight: sizes.dialogListMax },
});
