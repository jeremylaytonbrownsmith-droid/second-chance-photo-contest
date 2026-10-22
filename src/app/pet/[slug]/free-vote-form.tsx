"use client";

import { useState } from "react";

/** The no-purchase-necessary path (CLAUDE.md rule 7/8) — a free vote once a
 * day per entry, verified by email so it can't be refreshed for unlimited
 * votes. Two plain form POSTs (request a code, then confirm it), each a
 * full redirect back to this page with the next step in the URL — same
 * pattern as VoteForm's payment redirect, not a client-side fetch flow. */
export function FreeVoteForm({
  entryId,
  entrySlug,
  step,
  prefillEmail,
}: {
  entryId: string;
  entrySlug: string;
  step: "email" | "code";
  prefillEmail?: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (step === "code") {
    return (
      <form
        action="/api/free-votes/confirm"
        method="POST"
        onSubmit={() => setSubmitting(true)}
        className="rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm"
      >
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="entrySlug" value={entrySlug} />
        <input type="hidden" name="email" value={prefillEmail ?? ""} />

        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Free daily vote</p>
        <h2 className="mt-0.5 mb-3 text-lg font-bold text-brand-primary-dark">Enter your code</h2>
        <p className="mb-3 text-sm text-neutral-600">
          We sent a 6-digit code to <strong>{prefillEmail}</strong>. It expires in 10 minutes.
        </p>

        <label htmlFor="code" className="mb-1 block text-xs font-medium text-neutral-500">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-[0.3em] transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Confirming…" : "Confirm free vote"}
        </button>
      </form>
    );
  }

  return (
    <form
      action="/api/free-votes/request"
      method="POST"
      onSubmit={() => setSubmitting(true)}
      className="rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm"
    >
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="entrySlug" value={entrySlug} />

      <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">No purchase necessary</p>
      <h2 className="mt-0.5 mb-3 text-lg font-bold text-brand-primary-dark">Vote free, once a day</h2>

      <label htmlFor="freeEmail" className="mb-1 block text-xs font-medium text-neutral-500">
        Your email
      </label>
      <input
        id="freeEmail"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md border border-brand-primary px-6 py-3 text-sm font-semibold text-brand-primary transition-colors duration-150 hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending code…" : "Email me a free vote code"}
      </button>
    </form>
  );
}
