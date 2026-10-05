import { Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function OnboardingLayout() {
  const { profile } = useAuth();
  // Google/Apple sign-ups create a password first; email sign-ups already have one.
  const hasPassword = !!profile?.has_password;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasPassword}>
        <Stack.Screen name="create-password" />
      </Stack.Protected>
      <Stack.Protected guard={hasPassword}>
        <Stack.Screen name="account" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="follow" />
      </Stack.Protected>
    </Stack>
  );
}
