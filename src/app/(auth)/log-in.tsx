import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Divider, IconButton, Input, Screen, Text } from '@/components';
import { checkAccount, resendConfirmation, signInWithEmail, useGoogleSignIn } from '@/lib/auth';
import { spacing } from '@/theme/tokens';

type Problem = 'no-account' | 'unconfirmed' | 'google-only' | 'wrong-password' | 'other';

const problemText: Record<Problem, string> = {
  'no-account': "There's no account with this email yet.",
  unconfirmed: 'This account is waiting for you to confirm your email.',
  'google-only': 'This account signs in with Google and has no password yet.',
  'wrong-password': "That password doesn't match. Try again or reset it.",
  other: 'Could not log you in.',
};

export default function LogInScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const google = useGoogleSignIn();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<Problem>();
  const [detail, setDetail] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const logIn = async () => {
    setBusy(true);
    setProblem(undefined);
    setDetail(undefined);
    setNotice(undefined);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      // Work out *why* it failed so we can point to the right fix.
      try {
        const account = await checkAccount(email);
        if (!account.exists) setProblem('no-account');
        else if (!account.confirmed) setProblem('unconfirmed');
        else if (!account.has_password) setProblem('google-only');
        else setProblem('wrong-password');
      } catch {
        setProblem('other');
        setDetail(e instanceof Error ? e.message : undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendConfirmation(email);
      setProblem(undefined);
      setNotice(`We sent the confirmation link to ${email.trim()} again. Open it on this phone.`);
    } catch (e) {
      setDetail(e instanceof Error ? e.message : 'Could not resend the email.');
    }
  };

  return (
    <Screen>
      <IconButton icon={<Text variant="heading">‹</Text>} onPress={() => router.back()} accessibilityLabel="Back" variant="ghost" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Welcome back</Text>
        <Text variant="body" tone="muted">Log in with your email and password, or with Google.</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />

        {problem && <Text variant="small" tone="danger">{detail ?? problemText[problem]}</Text>}
        {problem === 'no-account' && (
          <Button label="Sign up instead" variant="outline" size="sm" onPress={() => router.replace('/sign-up')} />
        )}
        {problem === 'unconfirmed' && (
          <Button label="Resend confirmation email" variant="outline" size="sm" onPress={resend} />
        )}
        {notice && <Text variant="small" tone="success">{notice}</Text>}

        <Button label="Log in" onPress={logIn} loading={busy} disabled={!email || !password} fullWidth />
        <Button
          label="Forgot password?"
          variant="ghost"
          onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
        />
      </View>

      <Divider label="or" />

      <View style={{ gap: spacing.sm }}>
        <Button
          label="Continue with Google"
          variant={problem === 'google-only' ? 'primary' : 'secondary'}
          onPress={google.start}
          loading={google.busy}
          fullWidth
        />
        {google.error && <Text variant="small" tone="danger">{google.error}</Text>}
      </View>
    </Screen>
  );
}
