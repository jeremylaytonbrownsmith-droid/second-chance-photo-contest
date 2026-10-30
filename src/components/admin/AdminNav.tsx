"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminNav({ email, isSuperAdmin }: { email: string; isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const links = isSuperAdmin ? [...LINKS, { href: "/admin/users", label: "Admins" }] : LINKS;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight text-neutral-900">Admin</span>
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
