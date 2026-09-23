/** Coarse "N minutes/hours/days ago" — good enough for a social-proof feed
 * that re-renders on every page load (force-dynamic), so it doesn't need
 * to tick live client-side like the contest countdown does. */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
