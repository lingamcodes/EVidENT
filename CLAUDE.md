# Evident — CLAUDE.md

Read this file at the start of every session. It reflects locked product and
technical decisions — do not deviate from scope without asking first.

## Product

Community-organiser event platform. Primary users for GO-TO-MARKET are
university CCA, dorm, and orientation-group organisers in Singapore — this
determines acquisition/marketing priority only.

This is NOT a feature restriction. Any user (individual or org account) can
create, host, and manage their own events with full autonomy — event
creation is never gated to org accounts. Individuals are simply not the
primary group being recruited first; once onboarded (typically via an org
they follow or attend events with), they have identical event-hosting
capability to an org account.

Core hook: replace the WhatsApp + Google Forms + PayNow-screenshot patchwork
organisers currently use to run recurring events. The memory/photo timeline
is a retention feature, not the acquisition pitch — do not lead product
copy or onboarding with it.

## MVP scope — build ONLY these features

1. Org profile & event management
2. Event creation
3. RSVP management
4. PayNow integration — QR/deep-link generation ONLY. Not payment
   processing. Not reconciliation. Platform takes no cut.
5. Announcements-only event page — no comment thread, no in-app chat
6. Post-event photo/video upload → auto-sync to uploader's profile
7. Profile memory timeline
8. Org public event history

## Explicitly out of scope — do not add even if it seems natural

- In-app chat / comments on events (deferred, should-have for a later
  version)
- Island map / geographic discovery
- Followers-only event visibility gating and follow-request approval flow
  (schema is reserved — see Data model — but no UI or logic in MVP)
- Ticketing or payment processing beyond PayNow request links
- Any platform take-rate logic
- Web app (mobile only)
- Analytics dashboard for organisers
- AI-generated event suggestions or photo curation
- Third-party calendar sync

## Stack

- **Framework:** React Native + Expo, TypeScript
- **Backend / data layer:** Supabase (Postgres, Auth, Storage)
- **Distribution during build:** Expo Go / EAS internal distribution for
  tester previews — not App Store/Play Store submission yet
- **Dev environment:** Physical device via Expo Go only — no Xcode/Android
  Studio simulators set up. Preview and test on-device throughout build.
- **Deep linking:** Universal Links / App Links for already-installed users;
  web fallback landing page for not-yet-installed users (deferred deep
  linking via Branch.io only if reliability becomes a real problem
  post-launch — not needed for MVP)

## Data model

```
users
  id, email, name, avatar_url, account_type ('individual' | 'org'), created_at,
  username (unique, lowercase), bio (≤120), city, has_password, onboarded_at
  -- avatars in Storage bucket 'avatars' at <user_id>/avatar.jpg (512px JPEG)
  -- column grants: others can read only id, name, username, avatar_url, bio, city,
  --   account_type, created_at, onboarded_at. Own full row (email, has_password)
  --   via RPC get_my_profile(). Users may update only name, username, avatar_url,
  --   bio, city, account_type, has_password, onboarded_at; account_type and
  --   onboarded_at are locked after onboarding (trigger guard_user_update).
  --   New columns must be added to these grants explicitly.

follows
  id, target_id (→users), follower_id (→users),
  status ('pending' | 'accepted' | 'rejected'), created_at, decided_at
  -- schema only, no gating logic built in MVP

events
  id, host_id (→users), title, description, date_time, location,
  cover_image, capacity, visibility ('public' | 'followers' | 'private'),
  paynow_amount, paynow_reference, external_chat_link, created_at,
  ends_at, rsvp_by, map_link, status ('draft' | 'published'),
  allow_guest_invites, invite_code (unique), updated_at
  -- MVP uses 'public' and 'private' only; 'followers' reserved for v2
  -- description = "Additional notes"; capacity null = unlimited
  -- saved via RPC save_event(p_event, p_questions) in one transaction
  -- cover photos: Storage bucket 'event-covers' at <user_id>/<ts>.jpg (1600px JPEG)

event_invites              -- who can see/join a private event
  id, event_id (→events), invitee_id (→users), invited_by (→users), created_at
  -- invite links: join_event_by_code(code); public preview: get_invite_preview(code)
  --   (title, host, when, where, cover — never guests or media)

rsvps
  id, event_id (→events), user_id (→users),
  status ('yes' | 'no' | 'maybe'), waitlist_position, created_at, updated_at
  -- written ONLY via RPC set_rsvp(event, status|null): visibility, RSVP-by,
  --   start time, capacity → waitlist (waitlist_position), auto-promotion.
  --   Guests can't insert/update/delete directly; hosts may update/delete.
  -- events WITH a questionnaire: "Accept"/"I'm going" only opens the questions;
  --   you become going via rsvp_with_answers(event, answers), which requires
  --   every question answered and RSVPs + saves answers in one transaction.
  --   set_rsvp refuses 'yes' for such events. Shared rules: private.apply_rsvp.
  -- editing answers later: save_rsvp_answers(event, answers)
  -- other people's RSVPs are never readable directly; counts/feeds come from
  --   get_event_social, get_my_going, get_my_invites, get_home_feed
  --   (feed "is going to" = PUBLIC events only until a privacy setting exists)

media
  id, event_id (→events), uploader_id (→users),
  type ('photo' | 'video'), url, thumbnail_url, created_at

announcements
  id, event_id (→events), posted_by (→users), content, created_at

notifications
  id, user_id (→users), type, related_event_id, read (boolean), created_at

event_questions            -- RSVP questionnaire (host-defined)
  id, event_id (→events), position, text,
  type ('short' | 'mc' | 'check'), image_url, created_at

event_question_options
  id, question_id (→event_questions), position, label

rsvp_answers               -- one row per answer; checkbox = one row per ticked option
  id, rsvp_id (→rsvps), question_id (→event_questions),
  option_id (→event_question_options, null for short text), text_answer, created_at
```

## Database

Two Supabase projects (both free tier):
- **evident-dev** — used by Expo Go and the CLI. Safe to break or reset.
- **evident (prod)** — the project connected to the GitHub integration.
  Only changes merged into `main` reach it; never run CLI commands
  against prod.

Workflow for a schema change:
1. Write a new file in `supabase/migrations/`.
2. `npm run db:push-dev` → test on the phone against dev.
3. `npm run db:types` → commit the regenerated types with the migration.
4. PR → merge to `main` → GitHub integration applies it to prod.

One-time CLI setup: `npx supabase login`, then
`npm run db:link-dev -- <dev-project-ref>`.

- Schema lives in `supabase/migrations/` as SQL files. Never create or alter
  tables in the Supabase dashboard — write a new migration instead.
- Every table has row-level security. The app uses only the anon key
  (`.env.local`, see `.env.example`); the service_role key never ships.
- After each migration is applied to dev, regenerate types with `npm run db:types`.
- Supabase client: `src/lib/supabase.ts`.
- Test data (dev only): `npm run db:seed-dev` creates 7 fake accounts
  (`<username>@example.com` / `TestPass123!`) with events, RSVPs, follows and
  invites to the real account; `npm run db:unseed-dev` removes them all.
  Scripts in `scripts/dev-seed/`. Never run against prod.

## Styling conventions

- All colors, spacing, and typography defined as design tokens in `/theme`
- No hardcoded hex values or magic numbers in screen components
- Shared components (Button, Card, Input, etc.) live in `/components` —
  screens compose these, never define their own inline button/card styles

## Authentication

Supabase Auth. Three methods supported, all writing to the same `users`
table:
- **Google OAuth** — primary, one-tap
- **Apple Sign-In** — required alongside Google for App Store approval
- **Email/password** — fallback for users who don't want to link an
  OAuth account. MVP scope: standard signup + login + Supabase-triggered
  password reset email. Do NOT build custom email verification-on-signup
  or custom password-reset UI beyond Supabase defaults — out of scope
  for MVP, not worth the build cost here.

Account linking: if a user signs up via email/password and later logs in
via Google/Apple using the same email, MERGE into a single account/user
row rather than creating a duplicate. Same identity, multiple auth methods.

## Open items not yet resolved (do not assume — ask)

- PayNow implementation approach (SGQR generation library vs. other) —
  not yet confirmed buildable without a banking partnership
- Push notification provider (Expo push vs. OneSignal)
- Media compression approach before upload

## Styling rules
- All colours, font sizes, spacing, radii come from src/theme/tokens.ts. No hex codes or magic numbers anywhere else.
- Screens compose components from src/components/. Screens may only apply layout styles (flex, margin, gap, width). Never colour, typography, border, or radius.
- Visual variations are component props (variant, size), not style overrides.
- Before creating a new component, check src/components/ for an existing one to extend.
- Keyboard must never cover what the user is typing. Every screen is wrapped in
  `<Screen>`, which scrolls a focused field above the iOS keyboard (Android
  resizes natively). Text fields use `<Input>`, which hooks into this; any new
  text-entry component must call `useRevealAboveKeyboard()` on focus the same way.
  (react-native-keyboard-controller would be nicer but isn't in Expo Go.)