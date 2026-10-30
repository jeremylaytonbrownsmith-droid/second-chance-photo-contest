export function GalleryPausedNotice({ reason }: { reason?: string | null }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
      <p className="text-lg font-semibold text-amber-900">The contest is temporarily paused</p>
      <p className="mt-2 text-sm text-amber-800">{reason || "Please check back soon."}</p>
    </div>
  );
}
