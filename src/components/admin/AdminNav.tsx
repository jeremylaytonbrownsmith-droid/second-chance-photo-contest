"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { theme } from "@/lib/theme";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminNav({ email, isSuperAdmin }: { email: string; isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const links = isSuperAdmin ? [...LINKS, { href: "/admin/users", label: "Admins" }] : LINKS;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          {/* The brand logo, same as the public nav — plain bold "Admin"
              text here used to sit at the same visual weight as the real
              nav links below and read as another clickable tab even
              though it wasn't one. The logo reads unambiguously as
              branding, and linking it to the dashboard gives it a real
              purpose instead of just removing the confusion. */}
          <Link href="/admin/dashboard" className="flex items-center">
            <Image
              src={theme.logo.src}
              alt={theme.logo.alt}
              width={180}
              height={64}
              unoptimized
              className="h-8 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                    active ? "bg-brand-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/admin/account"
            className="hidden truncate text-xs text-neutral-400 underline-offset-2 transition-colors duration-150 hover:text-brand-primary hover:underline sm:inline"
            title="Change your password"
          >
            {email}
          </Link>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
