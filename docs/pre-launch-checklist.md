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

## Invite links (web page on Vercel, `web/`)
- [ ] Vercel env vars `SUPABASE_URL` / `SUPABASE_ANON_KEY` switched to **prod**
- [ ] App `EXPO_PUBLIC_INVITE_BASE_URL` set for prod builds (EAS env var)
- [ ] Universal links / App Links so `https://…/invite/CODE` opens the app directly:
      `apple-app-site-association` + `assetlinks.json` on the Vercel site, and
      `associatedDomains` / intent filters in `app.json`
- [ ] Real App Store / Google Play links on the invite page ("Get the app")
- [ ] Optional: custom domain (e.g. evident.sg) on Vercel

## Security settings
- [ ] Supabase → Authentication → enable **leaked password protection** (flagged by Security Advisor)

## Device testing
- [ ] Run through every screen on an **Android** phone as well as iPhone
      (tab icons, date/time pickers, keyboard, sign-in links)

## Temporary pieces to remove / move
- [ ] "Add a password" and "Sign out" buttons on the placeholder You tab → Settings
- [ ] Dev-only components gallery (`src/app/dev-components.tsx` + its link on the You tab)
- [ ] Placeholder Explore / Planner / You / Home screens replaced by the real designs
