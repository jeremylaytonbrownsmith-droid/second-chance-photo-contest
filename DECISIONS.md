# Decisions needed from Second Chance Pet Adoptions

Open items that need a real answer from the client (legal, tax, credentials,
or brand) before this ships to real donors. Nothing in this list should be
guessed at in code — build around it, flag it, wait for the answer.

## Legal — blocking before real launch

- **Free daily vote / "no purchase necessary" mechanism.** The contest
  charges $10 to enter and $1 per vote, with an optional free daily vote per
  verified email (built default-ON per the spec). Whether this structure is
  fully compliant with **North Carolina's specific charitable-gaming and
  lottery statutes** needs the nonprofit's attorney — not an assumption in
  this codebase. A lottery is generally prize + chance + consideration;
  this contest is popularity/skill-based (not chance-based) and offers a
  free path to vote, which is the standard way sweepstakes avoid lottery
  classification — but "generally" isn't a legal opinion, and NC has its
  own charitable-gaming rules (e.g. around raffles) that may or may not
  treat this differently. **Do not disable the free vote toggle, and do
  not launch to real donors, until this is confirmed in writing.**
- **Official contest rules document** — eligibility, entry restrictions,
  prize terms, dispute/refund policy, privacy notice for collected donor
  info. Needs attorney-drafted or attorney-reviewed copy before launch.
- **Tax-deductibility language on receipts.** Entry fees and votes may not
  be tax-deductible at all (donor receives consideration — a contest entry
  or a vote — in return), unlike a straight donation. Do not assume any
  portion is deductible without the nonprofit's accountant/attorney
  confirming the correct language, or the correct answer might be "none of
  this is deductible, say so plainly on the receipt."
- **EIN** — real value needed for receipts once finalized.

## Payments

- **Blackbaud Merchant Services / SKY API credentials.** Real integration
  needs a Blackbaud developer account and API credentials from the client's
  Blackbaud admin. Holding off requesting this — building against a mock
  provider and Stripe test-mode in the meantime, with the provider
  interface shaped to fit BBMS's likely hosted-payment-link pattern once
  credentials exist. Confirm with the client whether BBMS actually
  supports a hosted checkout/link flow (used to design the adapter) or
  requires a different integration shape before building the real adapter.

## Data / reporting

- **Exact Raiser's Edge NXT import format.** Building a standard CSV export
  (name, email, address, amount, date, transaction ID, payment type), but
  Raiser's Edge NXT's exact expected column headers/format should be
  confirmed against a real sample export from the client's Blackbaud
  instance before this is relied on for real bookkeeping.

## Branding

- Logo and brand colors: reused directly from the Second Chance Pet
  Adoptions auction/giving project (same client, same brand — not a code
  dependency between the two apps, just the same values). Confirm these
  are still current before real launch; update `src/lib/theme.ts` if not.

## Prize fulfillment

- The winning pet's photo is turned into a painted portrait and featured on
  a specially brewed, limited-edition beer — both the portrait commission
  and the beer production are vendor processes outside this app's scope.
  The app only needs admin-editable prize text/image fields (built) —
  confirm who owns the portrait and brewing workflow once a winner is
  picked.

## Admin login

- No signup flow, by design — the one AdminUser is created by setting
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` in the deploy environment (safe to leave
  set permanently; see `.env.example`). Moderation queue lives at
  `/admin/moderation`. `moderationEnabled` is back to the schema default
  (`true`) now that the queue exists — a submitted entry sits in `PENDING`
  until an admin approves or rejects it there.
- Login is scrypt-hashed password + mandatory WebAuthn/passkey 2FA
  (`AdminPasskey`), with lockout after 5 failed attempts (15 min) and a
  full audit log at `/admin/activity`. `ADMIN_DISABLE_PASSKEY_MFA` is an
  emergency bypass env var only — don't leave it set in production.
  Moderation, reporting (see below), and activity are all built. Fraud
  tooling and winner-selection/email are still unbuilt.

## Continuity notes (2026-10-29) — read this before picking the work back up

Context: client call happened this week; afterward the client asked for
every concrete edit from that call, with scaling (no crashes at launch,
no payment failures) called out as the top priority. What follows is
what shipped, what's still open, and what's blocking each open item.

**Shipped this session:**
- **Concurrency fix**: `src/app/api/entries/route.ts` — two people
  entering a same-named pet at the same instant could 500 on a slug
  collision (check-then-create race). Now retries on Prisma P2002 up to
  3 times (`createEntryWithUniqueSlug()`). Verified with 8 concurrent
  real requests against a live local DB — 8/8 succeeded, 8 distinct
  slugs. `src/app/api/votes/route.ts` was audited too and is already
  safe (`recomputeVoteCount` is idempotent, no unique-constraint risk).
- **Species + rescue source** — directly from the call (cat/dog split
  for moderation, "adopted from X" provenance). `Entry.species`
  (`AnimalSpecies`: `DOG`/`CAT`/`OTHER`, nullable for legacy rows) and
  `Entry.rescueSource` (free text). Surfaces in: the entry form (new
  required pet-type select + optional rescue-source field), gallery and
  leaderboard filters, moderation queue (now grouped by species —
  "accept dog, cat" batching the client asked for), the public pet page
  ("Adopted from {rescueSource}"), and the new reports export below.
- **`/admin/reports`** (`src/app/admin/reports/page.tsx` +
  `src/lib/admin/reports.ts` + `/api/admin/reports/export`) — exactly
  the columns the client asked for on the call: entry date, entrant
  name/email, pet name, species, votes, dollars raised. One `groupBy`
  query for the dollar totals, not N+1, so this stays fast as entries
  scale. CSV download logs a `REPORT_EXPORTED` audit row. Linked from
  moderation's header.

**Corrected after a second pass over the call transcript (2026-10-30)**
— the client flagged that something she'd asked for on the call looked
missing on the live site, which prompted a careful re-read. Two real
gaps turned up between what the transcript says and what had shipped:
- The gallery/leaderboard cards were showing a visible "Dog"/"Cat"
  pill badge. She never asked for that. What she *did* ask for was "a
  field between name and votes" showing the rescue/shelter an entry
  came from, so the rescue gets visibility. `Entry.rescueSource`
  existed in the schema and admin pages already, but was never
  surfaced on the actual public gallery/leaderboard rows where she
  wanted it. Fixed: species badge removed, "From {rescueSource}" line
  added between name and vote count on both pages.
- GoGo (her prior vendor) auto-emails an entrant once their photo is
  approved by moderation — she described this directly on the call.
  `src/app/api/admin/entries/[id]/approve/route.ts` logged the
  approval but never sent that email. Fixed: approving an entry now
  sends a best-effort "{petName} is approved and live!" email via the
  existing `getEmailProvider()` (same console/Resend provider used for
  payment-confirmation emails), linking to the pet's page.

Lesson for next time: when a schema/admin feature is "built," check it
actually reached the public page it was meant for before marking the
transcript item done — the rescue-source field is the second time this
session a feature existed in the data model and admin UI but not where
the client actually asked to see it.

**Also already built, just not labeled as such below before** — the
pet page's `ShareButtons` component (`src/app/pet/[slug]/share-buttons.tsx`)
already does the one-click Facebook/X/native-share-sheet/copy-link
share she described wanting ("they have the option to just share it...
beep, one button"). Only the QR code and a per-entry admin
approve/enable-sharing toggle are still open — see below.

**Shipped 2026-10-30, round 2** — picked up the rest of the buildable
call items on an open-ended "build anything from the call that needs
doing" request:
- **Sponsors** (`Sponsor` model/`SponsorTier` enum, `/admin/sponsors`
  CRUD with logo upload reusing the existing storage provider, homepage
  "Thanks to our sponsors" section near the bottom per the call —
  FEATURED shown larger, SUPPORTER smaller, matching her "three bigger
  sponsors and six smaller sponsors"). No real sponsor logos exist yet
  so the homepage section just stays hidden until the client adds one —
  nothing was faked to fill the space.
- **QR code + sharing** — ~~initially built admin-gated~~ **changed to
  automatic on 2026-10-30**, after the client questioned the point of a
  separate approval step. Correct call: an entry's page is already
  public and copy-pasteable the moment it's APPROVED, so gating only
  the share buttons/QR code behind a second admin click didn't protect
  anything — it just added busywork and slowed down the viral sharing
  that's the actual point of the feature. `src/app/api/admin/entries/
  [id]/approve/route.ts` now sets `shareApproved: true` in the same
  update as the approval itself; migration
  `20261030022953_backfill_share_approved` turned it on retroactively
  for entries already approved before this change. The Reports page's
  Sharing column/toggle stays as a manual **revoke** option — an admin
  can still turn sharing off for one specific entry without pulling the
  whole thing from the gallery, which is a real use case the toggle
  being present already covers at no extra cost. QR codes are generated
  server-side with the `qrcode` npm package as a data URL, not a
  third-party image API call.
- **Gallery randomize-on-refresh** — default sort is now `random`
  instead of `newest` when no `sort` is in the URL, so the gallery
  reshuffles on every load the way she described GoGo doing (verified:
  two loads with no query string returned different first entries).
  "Newest"/"Most votes" are still there in the dropdown for anyone who
  wants a stable order.
- **Cats and dogs only, this year** — caught on a follow-up ("remember
  she said there's only cats and dogs"), confirmed in the transcript:
  "I was a little conflicted this year... but you know, 2nd chance is
  cats and dogs." The entry form's Pet type select and the gallery/
  leaderboard species filters no longer offer "Other." `AnimalSpecies`
  keeps the `OTHER` enum value in the schema (no migration needed) for
  history and in case a future year reopens it — only the new-entry
  path (form + `entrySchema` in `src/app/api/entries/route.ts`) is
  restricted to DOG/CAT.

**Deferred — client call items not yet started**, each with what it's
blocked on:
- **Sitewide social-media presence links** (the org's own Facebook/
  Instagram, near "Enter your pet," separate from the per-entry share
  buttons above). Not blocked on anything client-side — just not
  started. Needs the client's actual social links.
- **Scheduled reminder emails** (e.g. "you haven't voted today" /
  "contest ending soon"). Needs Vercel Cron + an idempotent send-log
  table so a retry or overlapping cron run can't double-send. Blocked
  on: nothing technical — just not started; needs email copy too, which
  is a lighter lift than the legal copy below.
- **Site content pages** — About, Rules, Disclaimers, About the Artist,
  Sponsors. Blocked on: real copy from the client/attorney. CLAUDE.md's
  rule ("no official contest rules or legal copy ships without the
  nonprofit's attorney signing off in writing") covers Rules/Disclaimers
  specifically — do not draft placeholder legal text for those even if
  asked to "just put something there for now."
  See also the "Legal — blocking before real launch" section above,
  which this doesn't replace.
- **Calendar-shop external link**. Blocked on: the calendar product
  existing for this year (client wasn't sure yet as of the call).
- **Payment processor choice** (Stripe vs. PayPal vs. Venmo vs. BBMS).
  Blocked on: the client's treasurer, who was being asked for a
  preference as of the call. The app currently runs on a mock provider
  behind the `getPaymentProvider()` interface either way, so this is a
  swap-the-adapter decision, not a rearchitecture, whenever it lands.

**Open client-side action items** (not ours to build, but block things
above until they arrive): official contest rules/specs document,
sponsor logos, treasurer's payment-method preference, and GoGo report
examples the client offered to send over (may usefully shape the
`/admin/reports` columns further once seen).

## Admin dashboard + navigation (2026-10-30)

Client asked directly to simplify the admin navigation and add a
dashboard ("how many people have been on that day"), which traces back
to the call transcript: she wanted an admin dashboard with more
clarity on daily activity, and mentioned Google Analytics / Tag
Manager as how she'd get visitor numbers elsewhere.

- **Navigation**: `/admin/*` now shares one nav (`AdminNav` via
  `src/app/admin/layout.tsx`) — Dashboard / Moderation / Reports /
  Activity, with the signed-in email and sign-out always in the same
  place. Each page previously built its own header with a different
  subset of links; those are gone, replaced by the shared nav. The
  public marketing nav (`Nav.tsx`) is now hidden on `/admin/*` — the
  two navs stacked on every admin page was a real source of the
  "cluttered" feeling, not just inconsistent links.
- **Dashboard** (`/admin/dashboard`, `src/lib/admin/dashboard.ts`) —
  today's visitors/new entries/votes/raised, all-time totals, and a
  14-day visitor bar chart. `/admin` now redirects here instead of
  straight to moderation.
- **Visitor counting, specifically**: there's no Google Analytics Data
  API credentials on hand to pull real GA numbers into our own admin
  (that needs a service account + property ID from the client's GA,
  which was never requested). Instead, added a minimal first-party
  counter: `PageVisit` model, an anonymous httpOnly cookie (no IP, no
  user agent, no page path — just enough to dedupe a person per day),
  and a `VisitTracker` client component mounted site-wide except on
  `/admin/*` (so the admin's own usage doesn't inflate "people on the
  site"). If the client later wants this to actually be Google
  Analytics data instead, that's a credentials ask, not a rebuild — the
  dashboard's visitor card is isolated enough to swap the data source.

**Testing expectation, stated directly on the call**: before real
launch she wants "pretty heavy duty testing," explicitly naming the
payment-platform integration and the failure mode she's afraid of —
"we're getting ready to launch something and 800 people try to enter
and nobody can get in." The concurrency fix above (slug-collision
retry) is a direct response to that, but it's not the whole of it —
load/concurrency testing against whatever real payment processor gets
chosen should happen before go-live, not just unit-level correctness
testing.

**Unresolved, not about this app**: the client separately pasted some
soccer-officiating proof-points content earlier in the project and I
asked whether it belonged in a separate document from the "Rescue Brew"
one-pager brief — never got an answer. Worth asking again if that
one-pager resurfaces.

## 200-concurrent-vote load test (2026-10-30)

Ran a real 200-concurrent-request load test against a production build
(`next build && next start`, not dev mode) locally, driving the full
vote flow end to end: `POST /api/votes` → mock checkout → `GET
/api/payments/confirm`, weighted 40% onto one "popular pet" entry to
simulate the worst-case scenario she described (a rush at the very end
of the contest, concentrated on whoever's leading). Script:
`/tmp/.../scratchpad/load-test.js` (sandbox-local, not committed).

**Result: 200/200 succeeded, 0 errors, all within 1.4s wall clock.**
Cross-checked every entry's cached `voteCount` against the real sum of
`SUCCEEDED` transactions afterward — exact match on every entry,
including the one that took 252 of the 200 flows' votes concentrated
on a single row. No lost updates under contention.

**What this does and doesn't prove**: this validates the app's own
code path (Next.js + Postgres handling concurrent writes correctly) at
10x the "200 people" scenario she described. It does **not** test the
real payment processor under load — the mock provider has no network
call or rate limit of its own. Once a real processor (Stripe/BBMS) is
chosen and wired up, repeat a smaller version of this test against it
specifically — that's the one piece that can't be validated with mock
payments, and it's the piece she explicitly asked to stress-test.

## Multi-admin logins (2026-10-30)

She wants her own admin login, separate from the developer's, so the
activity log clearly shows who did what. Built `/admin/users` (visible
only to `SUPER_ADMIN`, in `AdminNav` as "Admins"): add an admin by
email + temporary password, remove one later. New admins get
`MODERATOR` role — full access to moderation/reports/sponsors/
dashboard, but can't add or remove other admin logins or touch the
`SUPER_ADMIN` account. Each login goes through the same mandatory
passkey 2FA enrollment as the original admin did on first sign-in.

**Follow-up, same day**: the client asked a sharp question — if she
can't change the temporary password, that means texting a password
around forever. Fixed with self-serve password changes:
`/admin/account` (linked from the admin's own email in the top-right
nav), requires the current password to set a new one, logs
`PASSWORD_CHANGED`. The flow now: a `SUPER_ADMIN` sets a *starting*
password and shares it once, the new admin signs in and changes it to
something only they know. Still no self-serve *reset* for a forgotten
password or signup/invite email — a `SUPER_ADMIN` would still need to
set a new starting password via `/admin/users` if someone gets fully
locked out. That's an acceptable gap for a two-or-three-admin team;
worth building if the admin roster ever grows past people who can just
ask each other.

## Content-moderation safety net (2026-10-30)

Client sent a detailed list of what to put in place against a bad photo
upload — product items to build plus paper/legal items to handle
separately. Built the product side; left the paper side to her own
channels (see below).

**Shipped:**
- **Automated image screening, scaffolded**: `src/lib/moderation/` (same
  adapter pattern as payments/storage). `NoopModerationProvider` is the
  default — no real screening happens until a real provider is
  configured. Two real providers built:
  - `GoogleVisionModerationProvider` — SafeSearch nudity/violence/racy
    detection via the Cloud Vision REST API with a plain API key, no
    service account needed. Only covers nudity/violence, not the "is
    this actually a pet" check (the list's item 2).
  - `ClaudeModerationProvider` (2026-10-30, client chose this one after
    comparing setup effort — roughly equal either way) — one Claude
    vision call covers *both* nudity/violence and the pet check in a
    single request, asked to respond with strict JSON
    (`{"nudity","violence","containsPet"}`) and parsed defensively
    (markdown-fence stripping, safe defaults if a field is missing).
    Uses `claude-haiku-5-5` directly via the Messages API (no SDK
    dependency, same plain-`fetch` style as the other providers).
  Both are **untested against their live APIs — no credentials exist in
  this environment to verify either end to end.** Set
  `MODERATION_PROVIDER=claude` + `ANTHROPIC_API_KEY` (or `google_vision`
  + `GOOGLE_VISION_API_KEY`) in Vercel, and run one real test image,
  before relying on either. Screening is best-effort and never blocks a
  submission; it only adds a warning badge to that entry in the
  moderation queue (`Entry.moderationFlags`) for a human to see.
- **Approval friction for flagged images**: partially covered by the
  above (flags show as a banner on the entry card), but there's no
  *extra* confirmation step beyond the existing Approve/Reject buttons
  yet — since no real provider is configured, this hasn't been exercised
  for real. Worth adding once a provider is actually live and flagging
  real entries.
- **Audit log**: already existed (`AdminAuditLog` — who approved what,
  when). No new work needed here; this item was already covered before
  this list arrived.
- **Public report button**: any visitor can report a photo from its pet
  page (`/pet/{slug}`), no login required. A report immediately pulls
  the entry from every public page (new `REPORTED` status — reuses the
  same `status: "APPROVED"` filters everywhere else already uses, so
  nothing extra had to change to make it disappear from the gallery/
  leaderboard/homepage/its own page) pending a fresh admin decision. The
  report reason and timestamp are logged (`EntryReport`) and shown in a
  new "Reported" section at the top of `/admin/moderation`, with
  Restore (report wasn't valid) or Pull permanently (→ `DISQUALIFIED`)
  actions. One known tradeoff, not mitigated: this is a low-friction
  public action, so it could be used to get a rival's photo hidden with
  a bogus report — mitigated only slightly by requiring a written
  reason. Acceptable given it still always resolves to a human decision,
  not an automatic takedown.
- **Kill switches, both levels**:
  - *Per-photo*: `DISQUALIFIED` existed in the schema since the
    original build but was never wired to anything — no code set it.
    Now live from two places: the Reports page (any `APPROVED`/
    `REPORTED` entry, "Pull from site") and the moderation queue's
    Reported section. Requires a reason, logged, entry/votes/
    transactions all stay in the database (never deleted).
  - *Sitewide*: new `Contest.galleryPaused` flag, toggled from
    `/admin/dashboard`. Blocks new entries and all three voting paths
    (paid, free-vote request, and — since free-vote confirm can't be
    reached without request succeeding — free-vote confirm too) at the
    API level, not just hidden in the UI, and shows a paused notice on
    the gallery, leaderboard, and every pet page. Verified: while
    paused, `/api/entries` and `/api/votes` both reject with a clear
    error even if called directly.
- **Upload consent checkbox**: required checkbox on the entry form ("I
  own this photo, it shows my pet, and it contains nothing
  inappropriate..."), enforced server-side (`entrySchema` rejects
  submission without it) in addition to the HTML `required` attribute.
  `Entry.consentConfirmedAt` records when, independent of the UI
  requiring it — verified both that an unchecked submission is rejected
  and that a checked one persists the timestamp. **Wording is a draft**,
  not attorney-reviewed — flagged in both the code comment and
  `DRAFT_CONTEST_RULES_FOR_ATTORNEY_REVIEW.md`.
- **CSAM handling — documented, not new code**: this app already never
  hard-deletes anything (CLAUDE.md rule 4 — soft delete only,
  everywhere, no exceptions in the admin UI), so "hide, don't delete"
  for a worst-case upload is already how the system behaves by default,
  not something that needed building. What's worth making sure the
  admin team actually knows: if something that bad ever shows up, it
  must be reported to NCMEC's CyberTipline
  (report.cybertip.org / 1-800-843-5678), and the file must **not** be
  deleted even after reporting — use the kill switch (hides it
  immediately) and leave the underlying record alone. This is
  operational knowledge for whoever's moderating, not a rule the code
  enforces.
- Verified against the real DB (not just typecheck/lint/build): report
  → hide → restore, kill switch → hide (checked the pet page 404s),
  sitewide pause → gallery/leaderboard/pet-page notice + blocked
  submission, consent checkbox rejected/accepted correctly. Re-ran the
  200-concurrent vote load test from the scaling section above against
  the updated code — still 200/200, 0 failures, vote counts still
  exactly matched the transaction sum afterward. All 18 existing unit
  tests still pass.

**Not built — these are the client's own channels, not ours to draft**:
- Signing as the LLC instead of personally, the services
  agreement/indemnification clause with Second Chance, and E&O
  insurance are all business/legal decisions for the client's own
  attorney (not Julie's — she represents the nonprofit, a different
  party with different interests than the client's LLC). Happy to draft
  a plain-English discussion starting point for that attorney if asked,
  the same way `DRAFT_CONTEST_RULES_FOR_ATTORNEY_REVIEW.md` was built
  for Julie's side — just hasn't been asked for yet.
