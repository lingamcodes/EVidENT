import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { MIN_PASSWORD_LENGTH, setPassword, signOut, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

/**
 * Google/Apple sign-ups land here first, laid out like the email sign-up page:
 * name, their email (locked), and a password, so they can also log in by email.
 */
export default function CreatePasswordScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const email = session?.user.email ?? profile?.email ?? '';
  const userId = session?.user.id;

  const [name, setName] = useState(profile?.name ?? '');
  const [password, setPw] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const ready = name.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH;

  const submit = async () => {
    if (!userId) return;
    setBusy(true);
    setError(undefined);
    try {
      const { error: nameError } = await supabase.from('users').update({ name: name.trim() }).eq('id', userId);
      if (nameError) throw nameError;
      await setPassword(userId, password);
      // has_password is now true, so onboarding moves on to step 1.
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your password.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs, paddingTop: spacing.xl }}>
        <Text variant="title">Make your account</Text>
        <Text variant="body" tone="muted">
          You're in with Google. Add a password so you can also log in with your email.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Input label="Email" value={email} editable={false} hint="From your Google account" />
        <Input
          label="Password"
          value={password}
          onChangeText={setPw}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
        />
        {error && <Text variant="small" tone="danger">{error}</Text>}
        <Button label="Continue" onPress={submit} loading={busy} disabled={!ready} fullWidth />
      </View>

      <Button label="Not you? Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
