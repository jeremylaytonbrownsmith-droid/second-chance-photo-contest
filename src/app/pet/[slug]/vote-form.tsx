"use client";

import { useState } from "react";
import type { VotePackage } from "@/lib/pricing";
import { centsForVotes } from "@/lib/pricing";

export function VoteForm({
  entryId,
  entrySlug,
  votePriceCents,
  packages,
}: {
  entryId: string;
  entrySlug: string;
  votePriceCents: number;
  packages: VotePackage[];
}) {
  const [selectedVotes, setSelectedVotes] = useState<number>(packages[0]?.votes ?? 5);
  const [customVotes, setCustomVotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCustomSelected = customVotes !== "";
  const activeVotes = isCustomSelected ? Number(customVotes) || 0 : selectedVotes;
  const activeCents = activeVotes > 0 ? centsForVotes(activeVotes, votePriceCents) : 0;

  return (
    <form
      action="/api/votes"
      method="POST"
      onSubmit={() => setSubmitting(true)}
      className="rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm"
    >
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <input type="hidden" name="votes" value={activeVotes} />

      <h2 className="mb-3 text-center text-lg font-bold text-brand-primary-dark">Vote for this pet</h2>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {packages.map((pkg) => {
          const isActive = !isCustomSelected && selectedVotes === pkg.votes;
          return (
            <button
              key={pkg.votes}
              type="button"
              onClick={() => {
                setSelectedVotes(pkg.votes);
                setCustomVotes("");
              }}
              className={`rounded-md border px-2 py-2.5 text-center text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-brand-accent"
              }`}
            >
              {pkg.votes}
              <span className="block text-xs font-normal opacity-80">${(pkg.priceCents / 100).toFixed(0)}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <label htmlFor="customVotes" className="mb-1 block text-xs font-medium text-neutral-500">
          Or enter a custom number of votes
        </label>
        <input
          id="customVotes"
          type="number"
          min={1}
          value={customVotes}
          onChange={(event) => setCustomVotes(event.target.value)}
          placeholder="e.g. 200"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="donorName" className="mb-1 block text-xs font-medium text-neutral-500">
            Your name
          </label>
          <input
            id="donorName"
            name="donorName"
            type="text"
            required
            maxLength={120}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="donorEmail" className="mb-1 block text-xs font-medium text-neutral-500">
            Your email
          </label>
          <input
            id="donorEmail"
            name="donorEmail"
            type="email"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || activeVotes <= 0}
        className="w-full rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Redirecting to payment…"
          : activeVotes > 0
            ? `Vote ${activeVotes.toLocaleString()}x — $${(activeCents / 100).toFixed(2)}`
            : "Choose a number of votes"}
      </button>
    </form>
  );
}
