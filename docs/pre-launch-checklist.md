# Pre-launch checklist

Work through this once every MVP screen is built, before the first App Store /
Play Store submission. Items came out of building sign-in and onboarding.

## Prod Supabase setup (EVidENT project, `geruengtswnxlobjvfid`)
Merging to `main` applies migrations automatically; auth settings are manual.
- [ ] Authentication → URL Configuration: **Site URL** `evident://`, **Redirect URLs** `evident://**`
- [ ] Google Cloud → OAuth client → add redirect URI
      `https://geruengtswnxlobjvfid.supabase.co/auth/v1/callback`
- [ ] Authentication → Providers → Google: on, with Client ID + secret
- [ ] Authentication → Providers → Email: **Confirm email** on
- [ ] Security Advisor: no warnings

## Required for store approval
- [ ] **Sign in with Apple** — Apple requires it when Google sign-in is offered
      (needs the Apple Developer account)
- [ ] **Delete account in the app** — Apple requires it for apps with sign-up
      (goes in Settings)
- [ ] **Publish the Google OAuth consent screen** — in "Testing" mode only
      listed test users can use Google sign-in
- [ ] **Custom SMTP** (e.g. Resend / Postmark) in Supabase for auth emails —
      the built-in sender is rate-limited and often lands in spam
- [ ] **Test sign-in on a development build** (not Expo Go) so `evident://`
      links are verified end to end
- [ ] Prod `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` set as
      EAS environment variables (never the service_role key)

## Temporary pieces to remove / move
- [ ] "Add a password" and "Sign out" buttons on the placeholder Home → Settings
- [ ] Dev-only **Components** tab (`src/app/(tabs)/components.tsx` + its tab in `app-tabs.tsx`)
