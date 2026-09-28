import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, SegmentedControl, StepProgress, Text } from '@/components';
import { MIN_PASSWORD_LENGTH, setPassword, signOut, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

type AccountType = 'individual' | 'org';
type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'taken' | 'available';

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

/** Onboarding 1 of 3 (design 10a): who you are and your handle. */
export default function AccountStep() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [accountType, setAccountType] = useState<AccountType>(profile?.account_type ?? 'individual');
  const [name, setName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [password, setPw] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const needsPasswordOffer = !profile?.has_password;
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  // Live availability check, debounced so we don't query on every keystroke.
  useEffect(() => {
    if (!username) return setStatus('idle');
    if (!USERNAME_PATTERN.test(username)) return setStatus('invalid');
    if (username === profile?.username) return setStatus('available');
    setStatus('checking');
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
      setStatus(data && data.id !== userId ? 'taken' : 'available');
    }, 400);
    return () => clearTimeout(timer);
  }, [username, userId, profile?.username]);

  const ready = name.trim().length > 0 && status === 'available' && !passwordTooShort;

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError(undefined);
    const { error: updateError } = await supabase
      .from('users')
      .update({ account_type: accountType, name: name.trim(), username })
      .eq('id', userId);

    if (updateError) {
      setSaving(false);
      if (updateError.code === '23505') setStatus('taken');
      else setError(updateError.message);
      return;
    }
    try {
      if (password) await setPassword(userId, password);
      router.push('/profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your password.');
    } finally {
      setSaving(false);
    }
  };

  const usernameMessage = {
    idle: undefined,
    invalid: '3–20 characters: lowercase letters, numbers, _ and .',
    checking: 'Checking…',
    taken: 'That one is taken',
    available: 'Available',
  }[status];

  return (
    <Screen>
      <StepProgress total={3} current={1} />
      <View style={{ gap: spacing.xs }}>
        <Text variant="eyebrow">Step 1 of 3</Text>
        <Text variant="title">Make your account</Text>
        <Text variant="body" tone="muted">A name and a handle. Everything else can wait.</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="eyebrow">I'm joining as</Text>
        <SegmentedControl
          options={[
            { key: 'individual', label: 'Myself' },
            { key: 'org', label: 'An organisation' },
          ]}
          value={accountType}
          onChange={setAccountType}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label={accountType === 'org' ? 'Organisation name' : 'Your name'}
          value={name}
          onChangeText={setName}
          autoComplete={accountType === 'org' ? 'off' : 'name'}
        />
        <Input
          label="Username"
          prefix="@"
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          success={status === 'available' ? usernameMessage : undefined}
          error={status === 'invalid' || status === 'taken' ? usernameMessage : undefined}
          hint={status === 'checking' ? usernameMessage : undefined}
        />
        {needsPasswordOffer && (
          <Input
            label="Create a password (optional)"
            value={password}
            onChangeText={setPw}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint={`So you can also log in with ${profile?.email ?? 'your email'}`}
            error={passwordTooShort ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
          />
        )}
      </View>

      {error && <Text variant="small" tone="danger">{error}</Text>}
      <Button label="Continue" onPress={save} loading={saving} disabled={!ready} fullWidth />
      <Button label="Not you? Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
