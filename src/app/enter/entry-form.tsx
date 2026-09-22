"use client";

import { useRef, useState } from "react";
import { resizeImageFile } from "@/lib/resize-image-client";

export function EntryForm({ entryFeeCents }: { entryFeeCents: number }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError(null);
    setPreview(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    try {
      const resized = await resizeImageFile(file);
      // Replace the input's file with the resized one via DataTransfer, so
      // the eventual native form submission (a real browser navigation, not
      // fetch) uploads the smaller version — this keeps typical phone
      // photos under Vercel's request size limit without ever touching
      // fetch/XHR, which matters because the payment redirect can land on
      // a cross-origin checkout page (Stripe) that a fetch-based approach
      // would hit CORS trouble with.
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(resized);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
      setPreview(URL.createObjectURL(resized));
    } catch {
      setFileError("Could not read that image — try a different file.");
      event.target.value = "";
    }
  }

  return (
    <form
      action="/api/entries"
      method="POST"
      encType="multipart/form-data"
      onSubmit={() => setSubmitting(true)}
      className="space-y-5"
    >
      <div>
        <label htmlFor="petName" className="mb-1 block text-sm font-medium text-neutral-700">
          Pet name
        </label>
        <input
          id="petName"
          name="petName"
          type="text"
          required
          maxLength={80}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="ownerName" className="mb-1 block text-sm font-medium text-neutral-700">
          Your name
        </label>
        <input
          id="ownerName"
          name="ownerName"
          type="text"
          required
          maxLength={120}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="ownerEmail" className="mb-1 block text-sm font-medium text-neutral-700">
          Your email
        </label>
        <input
          id="ownerEmail"
          name="ownerEmail"
          type="email"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-400">Used for your entry receipt — never shown publicly.</p>
      </div>

      <div>
        <label htmlFor="caption" className="mb-1 block text-sm font-medium text-neutral-700">
          Caption (optional)
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="photo" className="mb-1 block text-sm font-medium text-neutral-700">
          Photo
        </label>
        <input
          ref={fileInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          required
          onChange={handleFileChange}
          className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-primary file:transition-colors file:duration-150 hover:file:bg-brand-secondary"
        />
        {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a next/image-optimizable source
          <img src={preview} alt="Preview" className="mt-3 h-40 w-40 rounded-lg object-cover shadow-sm" />
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Redirecting to payment…" : `Continue to payment — $${(entryFeeCents / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
