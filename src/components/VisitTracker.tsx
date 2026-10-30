"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires once per full page load to count today's visit for the admin
 * dashboard — skipped on /admin so the owner's own moderation sessions
 * don't inflate the "people on the site" number. The root layout mounts
 * this once; it intentionally does not re-fire on client-side navigation
 * between pages, since one count per visit (not per route) is the point. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    fetch("/api/track-visit", { method: "POST" }).catch(() => {
      // Best-effort — a failed visit ping should never affect the visitor.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount only
  }, []);

  return null;
}
