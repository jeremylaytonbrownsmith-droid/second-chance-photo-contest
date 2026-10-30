# DRAFT — Pet Photo Contest Rules & Voting Structure Change

**STATUS: DRAFT. NOT APPROVED. NOT LIVE ANYWHERE.**
Nothing in this document is published on the site, sent to entrants, or
reflected in the app yet. The paid-only voting change described below has
**not** been made in the code. Everything here is pending your attorney's
written review and sign-off, per this project's own rule: no official
contest rules or legal copy ships, and the free-vote option doesn't come
out, until that's confirmed in writing.

---

## What we're asking the attorney to confirm

We currently run this contest with **paid votes plus one free vote per day
per person**, specifically so the contest clearly avoids NC's lottery
statute (free path = no "consideration" required to participate).

We'd like to move to **paid-only voting** ($1/vote, no free alternative),
matching how our prior vendor's platform (GoGo Photo Contest) runs
contests for other nonprofits. Our reasoning: under N.C.G.S. § 14-289, an
illegal lottery requires consideration + prize + chance together. The
winner here is decided strictly by vote count — no random drawing, no
chance element anywhere — so we believe removing the free-vote option
doesn't introduce a lottery problem.

**We are not a law firm and this is not a legal opinion. We're asking you
to confirm, in writing, whether this reasoning holds and whether
paid-only voting is safe to launch as described.**

Two sub-questions worth a direct answer either way:
1. Does `§ 14-289`'s three-element test apply the way we think it does to
   a vote-count-decided contest with no free path?
2. Is there any NC-specific wrinkle (electronic sweepstakes law, consumer
   protection rules around "no purchase necessary" contests generally,
   etc.) that would still favor keeping some free-participation option
   even without a pure lottery concern?

---

## Proposed official rules language (pending your edits/approval)

### 1. Selection criteria — no chance clause
> The winner of each contest period is the pet entry with the highest
> cumulative number of valid votes received by the stated closing date
> and time. Winners are determined solely by vote count. No random
> drawing, raffle, or chance-based process is used at any stage.

### 2. Tie-breaker — explicitly non-random
> In the event of an exact tie in vote count at closing, the entry
> submitted earliest (by original submission timestamp) is declared the
> winner. Ties are never resolved by drawing, coin toss, or any
> chance-based method.

*(Flagging for your review: this is the one rules clause with real
downstream risk if it's ever wrong — a random tiebreaker would
reintroduce the "chance" element the whole paid-only structure depends on
not having. Please confirm this wording is not just safe in form but
something we're actually required to implement exactly as written — the
app will be built to match whatever you approve here.)*

### 3. Payment / tax disclosure — needs your language, not ours
We have **not** drafted final wording for this one. Here's why: votes and
entry fees get something in return (an entry in the contest, a vote
toward a specific pet winning), which is the kind of "quid pro quo" that
can reduce or eliminate tax deductibility — the IRS doesn't treat "money
went to a 501(c)(3)" and "this specific payment is a deductible
charitable contribution" as the same thing. We don't want to tell
entrants something is tax-deductible if it isn't, or vice versa.

**What we need from you specifically**: the exact language our donation
receipts and rules page should use for (a) entry fees, (b) votes for
someone else's entry, and (c) votes for your own entry, if those should
be treated differently. Once we have that, it goes directly into the
code's receipt logic and the rules page — nothing is assumed in the
meantime.

What we *can* state plainly regardless of the tax answer:
> All entry fees and vote purchases are final and non-refundable, except
> as required by law.

### 4. Eligibility & entry window
> The contest opens [DATE/TIME, TIME ZONE] and closes [DATE/TIME, TIME
> ZONE]. [Open to all entrants / Open to NC residents only — please
> confirm which]. Second Chance Pet Adoptions reserves the right to
> disqualify any entry or vote suspected of fraud, automated/bot
> activity, or other manipulation, at its sole discretion.

*(The actual open/close dates need to come from Julie/the org — these
are placeholders, not assumptions.)*

---

## Context already on file (for completeness, not new asks)

These are pre-existing open items from `DECISIONS.md` in this repo,
included here so the attorney sees the whole picture in one place rather
than getting this issue by issue:

- **EIN** is still a placeholder in the codebase — needed before real
  receipts go out.
- **$250+ contemporaneous written acknowledgment** and **$75+ quid pro
  quo disclosure** requirements apply regardless of how the
  deductibility question above gets answered — standard IRS
  substantiation rules, not specific to this contest.
- The organization has run a version of this contest for 4 years via
  GoGo without incident — included as background, not as a substitute
  for review.

---

## What happens after approval

The moment we have written confirmation back, same day:
- The free-vote toggle is removed from the app (code, UI, and the daily
  free-vote database logic) — existing votes already cast, including
  past free votes, are untouched either way.
- The rules clauses above (as approved/edited by the attorney) get
  published on the site's rules page.
- Any "no purchase necessary" language currently on the site comes down,
  replaced by whatever the approved rules say instead.
