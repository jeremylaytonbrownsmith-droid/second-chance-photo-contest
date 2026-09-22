import { PrismaClient } from "@prisma/client";

/** Vercel's native Neon integration prefixes its auto-generated variable
 * (e.g. PHOTOCONTEST_DATABASE_URL) instead of populating the plain
 * DATABASE_URL our schema expects. scripts/vercel-build.sh applies the same
 * fallback for the build/migrate step, but serverless functions read env
 * vars fresh on every invocation — that export doesn't carry over to
 * runtime, so the lookup has to happen here too. */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const fallbackKey = Object.keys(process.env).find((key) => key.endsWith("_DATABASE_URL"));
  return fallbackKey ? process.env[fallbackKey] : undefined;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
