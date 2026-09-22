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

## Temporary: moderation is OFF on the demo contest

- `Contest.moderationEnabled` defaults to `true` in the schema (entries
  should sit in `PENDING` for admin review before going public), but the
  admin moderation queue (Phase 5) doesn't exist yet — a `PENDING` entry
  would never surface anywhere. The seed script sets the demo contest's
  `moderationEnabled` to `false` so a real submission through `/enter`
  shows up immediately after payment, for demo purposes. **Turn this back
  on** (or just stop overriding it) once the admin approve/reject UI ships,
  so real entries get reviewed before they're public.
