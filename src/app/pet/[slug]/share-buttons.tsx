"use client";

import { useState } from "react";

export function ShareButtons({ petName, pageUrl }: { petName: string; pageUrl: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Vote for ${petName} in the Second Chance Pet Adoptions photo contest!`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — the link is
      // still visible/selectable on the page, so this is a soft failure.
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: petName, text: shareText, url: pageUrl });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-[#1877f2] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Share on Facebook
      </a>
      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Share on X
      </a>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="rounded-md border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-accent"
        >
          More options
        </button>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}
