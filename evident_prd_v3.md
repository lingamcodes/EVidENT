# Evident — Product Requirements Document (v3)

A profile-first platform where users build a lasting social identity out of the events they host and attend. Community organisers — starting with university CCAs, dorm communities, and orientation groups — are the primary go-to-market wedge. This is an acquisition priority, not a feature restriction: any individual can create and host their own events with full autonomy, identical to an org account. Individuals are simply not the first group being recruited.

**Version:** 3.0
**Date:** July 2026
**Status:** Draft
**Market:** Singapore launch — university communities first
**Platform:** Cross-platform (iOS + Android)

---

### What changed from v2

Primary user segment narrowed to community/interest-group organisers, specifically university CCAs, dorm/hall communities, and orientation groups — not a broad consumer audience. Individual profiles are now explicitly framed as a retention layer that results from organiser adoption, not a separate acquisition target. The core hook reverts to the Heylo playbook — replacing WhatsApp/Google Forms/Instagram chaos for running a recurring group — with the memory album repositioned as a retention feature, not the primary pitch. Island map is cut from MVP. In-app chat is downgraded to should-have, deferred past v1.

---

## 01 — Overview

Evident is a tool for running a recurring community — a CCA, a dorm floor, an orientation group — that also happens to build a lasting visual record of that community over time. The organiser-facing tooling (event creation, RSVP management, attendee tracking) is the reason a group adopts the app. The memory layer (photos/videos tied to events, syncing into member profiles) is the reason they stay.

This sequencing matters. Organisers switch tools because their current setup is broken — juggling a WhatsApp group, a Google Form for RSVPs, and Instagram for photos, with no single source of truth. That operational pain is acute and provable (see Heylo's own reviews). The memory album, by contrast, is a feature people like once they have it, not one they'll switch platforms to get — Google Photos and iCloud already solve "photos exist somewhere" well enough that no one is paying to fix it. Evident should not ask early adopters to believe in the memory album; it should ask them to believe their CCA committee handover will be less painful.

Event pages intentionally do not host open conversation in v1. They carry structured details and host announcements only, with a single click-through link out to the group's existing WhatsApp/Telegram for actual back-and-forth. This keeps early scope tight and avoids competing with tools these groups already use daily.

---

## 02 — Problem and solution

**The problem**
Student community organisers — CCA exco members, dorm committee heads, orientation group leaders — run recurring events using a patchwork of tools that don't talk to each other: a WhatsApp group for coordination, a Google Form for RSVPs, PayNow screenshots for collecting money, and Instagram for photos that never make it back to a central place. Every year, a committee handover means passing on tribal knowledge instead of a system. There's no institutional memory — a CCA can't easily show a prospective member "here's what we've actually done this year."

**The solution**
A single app for running the group: create events, track RSVPs, collect payment via PayNow, and — because every event now lives in one place — automatically build a visual archive of the group's activity over time. The organiser adopts it to fix a real operational headache. The archive that results is what keeps the group (and its individual members) coming back after the immediate logistics problem is solved.

---

## 03 — User types

**Community / interest group (primary)**
CCAs, dorm/hall communities, and orientation groups. Runs an org profile used to manage recurring events, RSVPs, and payments, and that accumulates a public history of everything the group has run — a committee's own memory archive, and a pitch to prospective members. This is the segment the product is built for and the segment GTM targets first.

**Individual user (downstream)**
A member of an org who attends events, RSVPs, and uploads photos. Their personal profile is a byproduct of org participation, not something they're independently recruited around. Individual accounts are necessary infrastructure, not a separate acquisition target in v1.

**Event attendee**
Any invited individual — RSVPs, attends, and uploads photos, which is what turns attendance into a profile memory for both them and the org.

**Organisation (paid, post-scale)**
Pays to promote events once the platform has enough users to make promotion worthwhile. Not part of the launch cohort.

---

## 04 — Go-to-market hypothesis

This section is a stated hypothesis, not a validated plan — we have not yet interviewed CCA organisers, and this should be tested (5–10 conversations with exco members, minimum) before or alongside early build work, not after launch.

**Target beachhead:** CCA executive committees and dorm/hall committees at NUS, NTU, and SMU, timed around two natural adoption triggers:
- **Committee handover** (typically start of academic year) — new exco inherits a broken patchwork of tools and has a real reason to try something new, versus mid-year switching cost for an already-working setup.
- **Orientation week** — a hard deadline, a captive audience, and a high volume of one-off sub-events (games, briefings, socials) that make the RSVP/attendance pain most acute.

**Assumption to validate:** that CCA exco members feel the WhatsApp/Forms/PayNow patchwork as an acute enough problem to switch tools mid-year or at handover — not just a mild annoyance they've made peace with. This is the single highest-priority thing to test before committing further build time to the organiser-tooling feature set.

**Not yet answered and should be, before or during early build:** which specific CCAs/dorms are first outreach targets, whether outreach goes through student unions (NUSSU, NTU SAC, etc.) top-down or individual exco members bottom-up, and what the actual pitch/demo looks like with zero existing users on the platform.

---

## 05 — What success looks like

| Metric | Target |
|---|---|
| Active orgs (CCAs/dorms/orientation groups) running at least 1 event/month | Primary GTM signal — track from first cohort |
| Events with at least one post-event photo uploaded | ≥ 60% |
| Orgs that return to create a second event within 30 days of their first | ≥ 50% |
| Events attended or hosted per active user in first 90 days | ≥ 3 |
| Org exco members who cite Evident as replacing a specific prior tool (WhatsApp/Forms/PayNow) in feedback | Qualitative signal, track from first cohort |

---

## 06 — Screen map

| ID | Screen | Description |
|---|---|---|
| S-01 | Onboarding | Sign up, individual or org profile setup, interests |
| S-02 | Home / feed | Upcoming events, org updates, followed profiles |
| S-03 | Discover events | Browse public events by category, org, date |
| S-04 | Event page (pre) | Details, RSVP, attendee list, host announcements, chat click-through |
| S-05 | Event page (post) | Photo/video upload, contributes to attendee and org profiles |
| S-06 | Create event | Title, date, location, capacity, PayNow request, privacy, external chat link |
| S-07 | User profile | Bio, hosted/attended history, memory timeline |
| S-08 | Org profile | CCA/dorm/orientation group page — event history, member list, public memory archive |
| S-09 | Notifications | RSVPs, event reminders, photo uploads |
| S-10 | My events | Hosting, attending, past events |
| S-11 | Settings | Privacy, notifications, PayNow, account |
| S-12 | Search | Find events, users, and orgs |

*(Island map screen removed — cut from MVP; see §08.)*

---

## 07 — Features (MVP)

### Org profile & event management — `Must have`
The primary hook. An org (CCA, dorm, orientation group) can create a profile, run events, manage RSVPs, and track attendance in one place — the direct replacement for a WhatsApp + Google Form + PayNow-screenshot workflow. This is what organisers are recruited on.

### Event creation — `Must have`
Title, description, date/time, location, cover image, capacity, public/private toggle, PayNow request, and one external chat link for coordination.

### RSVP management — `Must have`
Attendees RSVP yes/no/maybe. Hosts see attendee list and counts. Optional waitlist when capacity is reached.

### PayNow integration — `Must have`
Hosts can request payment (shared costs, ticket price) via PayNow at RSVP. Free utility in v1 — platform does not take a cut. This is core organiser-tooling, not a monetisation feature yet, and it directly answers a named pain point in Heylo's own user reviews (no-show rates dropping once payment is collected upfront).

### Announcements-only event page (no in-app chat) — `Must have`
Hosts post one-way announcements. No comment thread or reply feature in v1. A "Chat about this event" button links out to the host's chosen external app (WhatsApp/Telegram). This should be validated with early organiser cohorts rather than assumed — if several report they'd need at least reactions/replies to announcements, that's a smaller scoped addition worth reconsidering ahead of full chat (see §08).

### Post-event photo/video upload → profile sync — `Must have`
After the event date passes, confirmed attendees can upload photos/videos. Every upload appears on the event page and syncs to the uploader's profile and the org's public event history. Positioned as a retention feature — the reason a group keeps using Evident after the first RSVP cycle — not the reason they sign up.

### Profile memory timeline — `Must have`
Chronological, visual history of every event a user hosted or attended. Retention surface, not acquisition hook.

### Org public event history — `Must have`
Public-facing archive on each org's profile, viewable by prospective members. Doubles as a pitch tool for CCA recruitment drives — "here's everything we've done this year."

### Notifications — `Should have`
Event reminders, new RSVPs (for hosts), new photo uploads, invitations. No engagement dark patterns. Given both Partiful and Heylo have unresolved, review-flagged notification reliability issues, this is a place to differentiate on execution quality rather than feature scope.

### Event sharing — `Should have`
Share event links externally to invite people not yet on the platform.

### In-app event chat — `Should have, not v1`
Deferred past v1. The target segment (existing CCA/dorm groups) is already WhatsApp/Telegram-entrenched, and asking them to also adopt in-app chat is a harder switch than the announcements-only model requires. Revisit based on early cohort feedback on whether announcements-only is sufficient (see §08 and §04 validation notes).

### Promoted event placements (post-scale) — `Could have`
Organisations pay to boost event visibility in discover and search. Clearly labelled as promoted. Introduced only once the platform has a user base worth promoting to.

---

## 08 — Explicitly out of scope (v1)

- Island map / geographic discovery surface — no user research or competitive signal supports this as MVP; cut entirely for now, revisit only if a specific discovery need surfaces post-launch
- In-app conversation or comment threads on event pages — deferred to should-have, not v1 (see §07)
- Ticketing or payment processing beyond PayNow request links
- Platform take-rate on PayNow transactions in phase 1
- Live streaming or real-time event coverage
- Web app — mobile only at launch
- AI-generated event suggestions or photo curation
- Analytics dashboard for event organisers
- Third-party calendar integrations (e.g. Google Calendar sync)
- Individual-user acquisition campaigns — individual growth is expected to follow org adoption, not be pursued independently in v1

---

## 09 — Monetisation model (phased)

**Phase 1 — Free for all users (launch)**
No cost to create an org or individual profile, host events, RSVP, or upload memories. PayNow is a free utility for hosts collecting money from attendees — the platform takes no cut. This phase is entirely about proving the organiser-tooling hook: getting CCAs, dorms, and orientation groups to actually switch off their existing patchwork. No revenue expected or forced at this stage.

**Phase 2 — Paid organisation promotion (post-scale)**
Once user base and event density are large enough that visibility is worth paying for, orgs can pay to promote events in discovery and search. Sole revenue stream, sequenced after user growth rather than launched alongside it.

*Note: willingness-to-pay should still be tested qualitatively during phase 1 organiser conversations (e.g. "would you pay for X") even though no paywall exists — this gives an early signal without adding friction to adoption.*

---

## 10 — Assumptions and risks

**Assumptions**
CCA/dorm/orientation-group organisers feel the WhatsApp/Forms/PayNow patchwork as an acute, switchable pain — not yet validated (see §04). Removing in-app chat won't hurt adoption because coordination already happens on WhatsApp/Telegram and organisers won't miss duplicating it — also not yet validated. Individual profile growth will follow naturally from org adoption without independent acquisition effort.

**Risks**
GTM hypothesis in §04 is untested — no organiser interviews have been conducted as of this version. This is the single highest-priority open risk and should be closed before or during early build, not after. Cold start problem persists at the org level even with a narrower segment: the first cohort of orgs need a reason to be first, with no existing content or network on the platform. Zero revenue in phase 1 means runway must fund growth alone with no monetisation validation until phase 2 — a hard sell to investors without qualitative willingness-to-pay signal from phase 1 conversations. Deferring chat is a bet that should be revisited quickly if early organiser feedback says otherwise. Inappropriate content in public org profiles/albums requires a moderation plan before public event histories go live.
