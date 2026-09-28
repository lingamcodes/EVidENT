import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'account' };

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="account" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="follow" />
    </Stack>
  );
}
