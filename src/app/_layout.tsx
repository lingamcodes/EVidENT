import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { Toast } from '@/components';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Caprasimo_400Regular,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  // Keep the native splash up until the design fonts are ready.
  if (!fontsLoaded) return null;

  // Light mode only for MVP.
  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

/** Picks which part of the app is reachable: signed out, onboarding, or the app itself. */
function RootNavigator() {
  const { session, profile, loading, passwordRecovery, notice, dismissNotice } = useAuth();

  // Wait for the stored session and profile so the wrong screen never flashes.
  if (loading) return null;

  const signedIn = !!session && !passwordRecovery;
  const onboarded = !!profile?.onboarded_at;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && passwordRecovery}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="set-password" options={{ presentation: 'modal' }} />
          <Stack.Screen name="events/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="events/[id]" />
          <Stack.Screen name="events/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="events/[id]/rsvp" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="invite/[code]" />
          <Stack.Screen name="dev-components" />
        </Stack.Protected>
      </Stack>
      <Toast message={notice} onDismiss={dismissNotice} />
      <AnimatedSplashOverlay />
    </>
  );
}
