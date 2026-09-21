/**
 * Image storage abstraction — pet photo uploads go through this, never
 * directly through an S3/R2 SDK call elsewhere in the app. Cloudflare R2
 * is the production target (per the client's spec); a local-filesystem
 * provider is the working default for dev, tests, and demos so nothing
 * requires real credentials to try the app.
 */

export interface UploadInput {
  /** A stable, URL-safe key, e.g. "entries/biscuit-a1b2.jpg". Callers own
   * uniqueness — providers don't generate keys. */
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadResult {
  url: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
}
