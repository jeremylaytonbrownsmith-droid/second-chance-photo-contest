# Second Chance Pet Adoptions: Photo Contest

A standalone fundraising photo contest app for Second Chance Pet Adoptions,
modeled on GoGo Photo Contest but owned by the nonprofit so they keep the
platform fees. Lives on a subdomain (e.g. contest.secondchancenc.org),
linked from their WordPress site — not a WordPress plugin.

## This is a separate project from the auction/giving system

Second Chance also has a separate auction/giving app (`second-chance-nc`).
**Never** import code from it, share its database, share its environment
variables, or couple deployments. Same client, same brand, fully independent
codebase. If a future task looks like it wants to reach into that repo,
stop and ask first.

## Hard rules

1. **Never store card numbers.** Payment credentials live with the payment
   processor. The database stores a processor reference (session/charge ID)
   and nothing else.
2. **All money is integer cents.** No floats, anywhere. Amounts are `Int` in
   Prisma and named with a `_cents` suffix.
3. **Every payment event is logged.** Entry fees, votes, and refunds each
   write a `Transaction` row — who, what, when, amount, processor, status.
   This is the nonprofit's donor/tax record, not just app state.
4. **Nothing is hard deleted.** Entries are disqualified or rejected with a
   reason, never removed. Transactions are marked refunded, never deleted.
5. **Every table is exportable to CSV from the admin UI**, including a
   Raiser's Edge NXT-formatted export for donor/tax records.
6. **The payment processor is a sync target behind an adapter, not the
   schema.** Blackbaud Merchant Services (via the Blackbaud SKY API) is the
   production target; a mock provider and a Stripe test-mode provider are
   the working implementations until real BBMS credentials exist. Everything
   in the app talks to the `PaymentProvider` interface
   (`src/lib/payments/provider.ts`), never to a specific processor's SDK
   directly. The interface is shaped around "create a checkout session →
   get a hosted redirect URL → a webhook/return confirms payment," since
   that's how both Stripe Checkout and Blackbaud's hosted payment links work
   — swapping in real BBMS should mean writing one new adapter, not
   redesigning the payment flow.
7. **No official contest rules or legal copy ships without the nonprofit's
   attorney signing off in writing**, the same way tax logic on the auction
   app needed the accountant's sign-off. This specifically covers: the
   free-daily-vote "no purchase necessary" mechanism (paid-vote contests
   without a free alternative risk being treated as an illegal lottery in
   some states — this needs North Carolina-specific charitable-gaming
   review, not an assumption baked into the code), prize eligibility and
   fulfillment terms, and any tax-deductibility language on receipts.
   Track open legal questions in `DECISIONS.md`, don't guess at them.
8. **The free daily vote toggle defaults ON** and existing to satisfy rule 7
   — don't let a future change quietly turn it off without that being a
   deliberate, logged decision.

## Working conventions

- Stack: Next.js (App Router) + TypeScript, PostgreSQL (Neon) via Prisma,
  Cloudflare R2 for image storage, `@vercel/og` for dynamic Open Graph
  images, Vitest for unit tests, Playwright for end-to-end tests, deployed
  to Vercel.
- Payment and email are both behind adapter interfaces
  (`src/lib/payments/`, `src/lib/email/`) with a fake/console implementation
  for dev and tests, same pattern as the eTapestry adapter on the auction
  project. Application code never imports a specific provider's SDK outside
  that provider's own adapter file.
- Build order: schema → payment provider interface (mock first) → pricing
  and vote-counting as pure, tested functions → CRUD/UI around them.
- Decisions that need the client (legal review, BBMS credentials, exact
  Raiser's Edge NXT export format, brand asset finalization) go in
  `DECISIONS.md`, not into an assumption baked into code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
