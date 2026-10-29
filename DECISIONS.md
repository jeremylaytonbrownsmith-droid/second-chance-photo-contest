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

**Deferred — client call items not yet started**, each with what it's
blocked on:
- **Sponsor section** (schema + admin CRUD + logo upload + display on
  homepage). Blocked on: sponsor logos/names from the client.
- **Social share button + QR code**, with an admin toggle to
  approve/enable sharing per entry or sitewide. Blocked on: a design
  decision on default-on vs. admin-gated (client raised both; didn't
  settle on one).
- **Scheduled reminder emails** (e.g. "you haven't voted today" /
  "contest ending soon"). Needs Vercel Cron + an idempotent send-log
  table so a retry or overlapping cron run can't double-send. Blocked
  on: nothing technical — just not started; needs email copy too, which
  is a lighter lift than the legal copy below.
- **Gallery randomize-on-refresh** — mentioned as a behavior the client
  likes from GoGo's product. Not blocked on anything; just not done.
  Worth weighing against the newest-first ordering already used on the
  homepage showcase (don't silently change both without noticing if
  they start to conflict).
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

**Unresolved, not about this app**: the client separately pasted some
soccer-officiating proof-points content earlier in the project and I
asked whether it belonged in a separate document from the "Rescue Brew"
one-pager brief — never got an answer. Worth asking again if that
one-pager resurfaces.
