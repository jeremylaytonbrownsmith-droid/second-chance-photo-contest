# Second Chance Pet Adoptions — Photo Contest

A fundraising pet photo contest app for Second Chance Pet Adoptions
(secondchancenc.org), modeled on GoGo Photo Contest but owned by the
nonprofit so they keep the platform fees. Standalone from the org's other
apps — see `CLAUDE.md` for the isolation rule.

Status: **Phase 1 (foundation) in progress.** Entries, the public gallery,
voting, the leaderboard, and the admin dashboard are not built yet — see
the phase list below.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Neon) via Prisma
- Cloudflare R2 for pet photo storage
- `@vercel/og` for dynamic Open Graph / share images
- Stripe (test mode) and a mock provider behind a `PaymentProvider`
  interface — Blackbaud Merchant Services (BBMS) is the production target,
  not yet wired in (see `DECISIONS.md`)
- Resend for email, with a console logger in dev
- Vitest (unit) + Playwright (end-to-end)
- Deployed to Vercel

## Setup

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL at minimum
npx prisma migrate dev     # creates the schema in your database
npm run dev
```

Everything else in `.env.example` has a working default for local dev —
`PAYMENT_PROVIDER=mock` and `EMAIL_PROVIDER=console` need no external
accounts at all.

## Switching payment providers

The app never talks to a payment SDK directly — everything goes through
`src/lib/payments/provider.ts`'s `PaymentProvider` interface, selected by
the `PAYMENT_PROVIDER` env var:

- `mock` (default) — no external account, no network call. "Paying" happens
  on an in-app page; useful for demos and CI.
- `stripe` — real Stripe Checkout in test mode. Set `STRIPE_SECRET_KEY` to
  a `sk_test_...` key.
- `bbms` — not implemented yet. Real Blackbaud SKY API credentials are
  needed from the client first (see `DECISIONS.md`); once they exist, add
  `src/lib/payments/bbms-provider.ts` implementing the same
  `PaymentProvider` interface and a `case "bbms"` in
  `src/lib/payments/index.ts`. Nothing else in the app should need to
  change.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright) — starts the dev server itself
```

## Deploying

Deploy target is Vercel. `npm run build` runs `prisma migrate deploy`
before `next build`, so schema migrations apply automatically on deploy
once `DATABASE_URL` is set in the Vercel project's environment variables.

## Project docs

- `CLAUDE.md` — hard rules for anyone (human or AI) working in this repo.
- `DECISIONS.md` — open questions that need an answer from the client
  (legal review, BBMS credentials, tax language, brand assets) before real
  launch. Don't guess at these.
- `DEMO.md` — will hold a client-meeting walkthrough once there's enough
  built to demo (end of Phase 6).
