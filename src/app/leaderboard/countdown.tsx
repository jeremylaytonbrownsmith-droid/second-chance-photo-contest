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
  const [label, setLabel] = useState(() => timeLeft(endsAt));

  useEffect(() => {
    const id = setInterval(() => setLabel(timeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span>{label}</span>;
}
