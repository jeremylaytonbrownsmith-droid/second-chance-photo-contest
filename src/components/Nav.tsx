"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { theme } from "@/lib/theme";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/enter", label: "Enter Your Pet" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
          <Image
            src={theme.logo.src}
            alt={theme.logo.alt}
            width={140}
            height={50}
            unoptimized
            className="h-9 w-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-brand-primary"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-brand-primary transition-all duration-200 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 transition-colors duration-200 hover:bg-brand-accent hover:text-brand-primary sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      <nav
        className={`grid overflow-hidden border-t border-neutral-200 bg-white transition-[grid-template-rows] duration-200 sm:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-0"
        }`}
      >
        <div className="flex min-h-0 flex-col gap-1 px-6 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-brand-accent hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
