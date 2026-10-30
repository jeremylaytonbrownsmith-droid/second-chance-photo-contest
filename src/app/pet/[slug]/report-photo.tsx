export function ReportPhoto({ entryId, entrySlug }: { entryId: string; entrySlug: string }) {
  return (
    <details className="group mt-4 text-center">
      <summary className="cursor-pointer list-none text-xs text-neutral-400 hover:text-neutral-600">
        Report this photo
      </summary>
      <form
        action={`/api/entries/${entryId}/report`}
        method="POST"
        className="mx-auto mt-2 flex max-w-xs flex-col items-center gap-2"
      >
        <input type="hidden" name="entrySlug" value={entrySlug} />
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="What's wrong with this photo?"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
        >
          Submit report
        </button>
      </form>
    </details>
  );
}
