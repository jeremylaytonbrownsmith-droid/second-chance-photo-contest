import Image from "next/image";
import { theme } from "@/lib/theme";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-accent px-6 py-16 text-center">
      <Image src={theme.logo.src} alt={theme.logo.alt} width={220} height={78} priority className="h-16 w-auto" />
      <h1 className="text-2xl font-semibold text-brand-primary-dark sm:text-3xl">
        Pet Photo Contest
      </h1>
      <p className="max-w-md text-sm text-neutral-600">
        Foundation phase — entries, gallery, voting, and the leaderboard are
        being built next.
      </p>
    </main>
  );
}
