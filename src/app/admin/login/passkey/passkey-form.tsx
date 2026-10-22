"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export function PasskeyForm() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setStatus("working");
    setError(null);
    try {
      const optionsRes = await fetch("/api/admin/passkey/authenticate/options");
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't start passkey sign-in");
      }
      const optionsJSON = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON });

      const verifyRes = await fetch("/api/admin/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok || !result.ok) {
        throw new Error(result.error ?? "That passkey couldn't be verified");
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
        onClick={handleVerify}
        disabled={status === "working"}
        className="w-full rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "working" ? "Waiting for Face ID / Touch ID…" : "Continue with passkey"}
      </button>
    </div>
  );
}
