import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, IconButton, Input, Screen, StepProgress, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

const BIO_MAX = 120;

/** Onboarding 2 of 3 (design 10b): photo, one line about you, city. */
export default function ProfileStep() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? 'Singapore');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const addPhoto = async () => {
    if (!userId) return;
    setUploading(true);
    setError(undefined);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) {
        const { error: updateError } = await supabase.from('users').update({ avatar_url: url }).eq('id', userId);
        if (updateError) throw updateError;
        setAvatarUrl(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError(undefined);
    const { error: updateError } = await supabase
      .from('users')
      .update({ bio: bio.trim() || null, city: city.trim() || null })
      .eq('id', userId);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else router.push('/follow');
  };

  const name = profile?.name || 'You';

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />
      <StepProgress total={3} current={2} />
      <View style={{ gap: spacing.xs }}>
        <Text variant="eyebrow">Step 2 of 3</Text>
        <Text variant="title">A face and a line</Text>
      </View>

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={name} uri={avatarUrl} size="xxl" />
        <Text variant="heading">{name}</Text>
        {profile?.username && <Text variant="small" tone="muted">@{profile.username}</Text>}
        <Button
          label={avatarUrl ? 'Change photo' : 'Add a photo'}
          variant="secondary"
          size="sm"
          onPress={addPhoto}
          loading={uploading}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label="One line about you"
          value={bio}
          onChangeText={setBio}
          maxLength={BIO_MAX}
          multiline
          placeholder="Sunrise walks, night markets, and one badly-organised picnic a month."
          hint={`${bio.length} / ${BIO_MAX}`}
        />
        <Input label="City" value={city} onChangeText={setCity} autoComplete="off" />
      </View>

      {error && <Text variant="small" tone="danger">{error}</Text>}
      <Button label="Continue" onPress={save} loading={saving} disabled={uploading} fullWidth />
    </Screen>
  );
}
