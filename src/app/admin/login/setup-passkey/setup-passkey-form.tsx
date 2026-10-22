"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

/** Mandatory on an admin's very first login after this shipped — there's
 * no registered passkey yet, so this has to run before the real session
 * cookie is issued (src/app/api/admin/login/route.ts sends here instead
 * of straight to /admin/moderation when passkeyCount === 0). */
export function SetupPasskeyForm() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setStatus("working");
    setError(null);
    try {
      const optionsRes = await fetch("/api/admin/passkey/register/options");
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't start passkey setup");
      }
      const optionsJSON = await optionsRes.json();

      const attestation = await startRegistration({ optionsJSON });

      const verifyRes = await fetch("/api/admin/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok || !result.ok) {
        throw new Error(result.error ?? "Couldn't verify the new passkey");
      }
      window.location.href = result.redirect;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — try again");
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSetup}
        disabled={status === "working"}
        className="w-full rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "working" ? "Waiting for Face ID / Touch ID…" : "Set up a passkey"}
      </button>
    </div>
  );
}
