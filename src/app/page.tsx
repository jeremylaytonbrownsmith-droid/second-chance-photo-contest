import Image from "next/image";
import Link from "next/link";
import { theme } from "@/lib/theme";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-accent px-6 py-16 text-center">
      <Image src={theme.logo.src} alt={theme.logo.alt} width={220} height={78} priority className="h-16 w-auto" />
      <h1 className="text-2xl font-semibold text-brand-primary-dark sm:text-3xl">
        Pet Photo Contest
      </h1>
      <p className="max-w-md text-sm text-neutral-600">
        Vote for your favorite pets and help {theme.org.name} raise funds for pets in need.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/gallery"
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-dark"
        >
          Browse the gallery
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-md border border-brand-primary px-5 py-2.5 text-sm font-medium text-brand-primary hover:bg-white"
        >
          View the leaderboard
        </Link>
      </div>
      <p className="mt-6 max-w-md text-xs text-neutral-400">
        Entry submissions open soon — this is a working preview with demo entries.
      </p>
    </main>
  );
}
