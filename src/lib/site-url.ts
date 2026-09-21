/** Absolute base URL for building shareable links and OG image URLs.
 * Falls back to localhost for dev — set NEXT_PUBLIC_SITE_URL in production. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
