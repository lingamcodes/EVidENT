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
  id, email, name, avatar_url, account_type ('individual' | 'org'), created_at

follows
  id, target_id (→users), follower_id (→users),
  status ('pending' | 'accepted' | 'rejected'), created_at, decided_at
  -- schema only, no gating logic built in MVP

events
  id, host_id (→users), title, description, date_time, location,
  cover_image, capacity, visibility ('public' | 'followers' | 'private'),
  paynow_amount, paynow_reference, external_chat_link, created_at
  -- MVP uses 'public' and 'private' only; 'followers' reserved for v2

rsvps
  id, event_id (→events), user_id (→users),
  status ('yes' | 'no' | 'maybe'), waitlist_position, created_at

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

- Schema lives in `supabase/migrations/` as SQL files. Never create or alter
  tables in the Supabase dashboard — write a new migration instead.
- Every table has row-level security. The app uses only the anon key
  (`.env.local`, see `.env.example`); the service_role key never ships.
- After each migration is applied, regenerate types:
  `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`
- Supabase client: `src/lib/supabase.ts`.

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