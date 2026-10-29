"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface HeroEntry {
  id: string;
  photoUrl: string;
}

// Three bands per side, hugging the edges — see src/app/page.tsx for how
// these were sized to the hero's actual ~430px height with no overlap.
const POSITIONS = [
  "left-[2%] top-[2%] -rotate-6",
  "right-[2%] top-[2%] rotate-6",
  "left-[2%] top-[36%] rotate-3",
  "right-[2%] top-[36%] -rotate-3",
  "left-[2%] top-[70%] -rotate-2",
  "right-[2%] top-[70%] rotate-2",
];

const SLOT_COUNT = POSITIONS.length;
const ROTATE_MS = 150_000; // 2.5 minutes

function pickSlots(pool: HeroEntry[], count: number): HeroEntry[] {
  if (pool.length <= count) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Client component so the rotation timer can live in the browser — the
 * pool (every entry the server showed us, up to the homepage's showcase
 * cap) is picked server-side once; this just swaps which slice of it is
 * visible every few minutes. With 6 or fewer entries in the pool there's
 * nothing new to rotate to yet, so it quietly does nothing until there is. */
export function HeroCollage({ pool }: { pool: HeroEntry[] }) {
  const [visible, setVisible] = useState<HeroEntry[]>(() => pickSlots(pool, SLOT_COUNT));

  useEffect(() => {
    if (pool.length <= SLOT_COUNT) return;
    const interval = setInterval(() => {
      setVisible(pickSlots(pool, SLOT_COUNT));
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [pool]);

  if (visible.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      {visible.map((entry, index) => (
        <div
          key={entry.id}
          className={`absolute h-24 w-24 rounded-sm bg-white p-2 shadow-lg lg:h-28 lg:w-28 ${POSITIONS[index]}`}
        >
          <div className="relative h-full w-full overflow-hidden">
            <Image src={entry.photoUrl} alt="" fill sizes="112px" className="object-cover" />
          </div>
        </div>
      ))}
    </div>
  );
}
