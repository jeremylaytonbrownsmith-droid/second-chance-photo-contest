"use client";

import { useEffect, useState } from "react";

function timeLeft(endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return "Contest has ended";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export function Countdown({ endsAt }: { endsAt: string }) {
  // Starts null so the server-rendered markup and the client's first render
  // match exactly (both render nothing) — computing the real value only
  // client-side, after mount, avoids a hydration mismatch against the
  // server's render time vs. the browser's.
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(timeLeft(endsAt));
    const id = setInterval(tick, 1000);
    // Deferred via setTimeout rather than called directly in the effect
    // body, so the first tick doesn't trigger a same-render cascading
    // setState — it still lands on the next microtask, effectively
    // immediately.
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(initial);
    };
  }, [endsAt]);

  return <span>{label ?? " "}</span>;
}
