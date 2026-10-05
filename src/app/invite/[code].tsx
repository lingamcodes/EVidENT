import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, CoverImage, IconButton, Screen, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { getInvitePreview, joinByCode, type InvitePreview } from '@/lib/events';
import { formatWhen } from '@/lib/format';
import { spacing } from '@/theme/tokens';

/** Opened from an invite link or a pasted code: preview the event, then join it. */
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { clearPendingInvite } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    clearPendingInvite(); // opened directly; Home doesn't need to reopen it
    getInvitePreview(code)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [code, clearPendingInvite]);

  const join = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setJoinedId(await joinByCode(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join this event.');
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => router.replace('/');

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">×</Text>} onPress={goHome} accessibilityLabel="Close" variant="ghost" />

      {preview === undefined && <Text variant="body" tone="muted">Loading invite…</Text>}

      {preview === null && (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">This invite isn't valid</Text>
            <Text variant="body" tone="muted">The event may have been deleted, or the link was copied wrong.</Text>
          </View>
        </Card>
      )}

      {preview && (
        <>
          <Text variant="eyebrow">You're invited</Text>
          {preview.cover_image && <CoverImage uri={preview.cover_image} accessibilityLabel="Event cover" />}
          <View style={{ gap: spacing.xs }}>
            <Text variant="display">{preview.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar name={preview.host_name} uri={preview.host_avatar_url} size="xs" />
              <Text variant="small" tone="muted">Hosted by {preview.host_name}</Text>
            </View>
          </View>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <View style={{ gap: spacing.xxs }}>
                <Text variant="eyebrow">When</Text>
                <Text variant="bodyStrong">{formatWhen(preview.date_time)}</Text>
              </View>
              {preview.location && (
                <View style={{ gap: spacing.xxs }}>
                  <Text variant="eyebrow">Where</Text>
                  <Text variant="bodyStrong">{preview.location}</Text>
                </View>
              )}
            </View>
          </Card>

          {joinedId ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="body" tone="success">You're in. RSVP is coming next.</Text>
              <Button
                label="View event"
                onPress={() => router.replace({ pathname: '/events/[id]', params: { id: joinedId } })}
                fullWidth
              />
              <Button label="Go home" variant="ghost" onPress={goHome} />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Button label="Join event" onPress={join} loading={busy} fullWidth />
              {error && <Text variant="small" tone="danger">{error}</Text>}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
