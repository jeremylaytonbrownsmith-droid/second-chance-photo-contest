import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, UploadInput, UploadResult } from "./provider";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Writes into public/uploads and serves the file straight from Next's
 * static file handling — zero setup, but local-disk-only, so it doesn't
 * survive a redeploy on Vercel. Fine for local dev and demos; switch to
 * the R2 provider (STORAGE_PROVIDER=r2) before real entries go live. */
export class LocalStorageProvider implements StorageProvider {
  async upload({ key, buffer }: UploadInput): Promise<UploadResult> {
    const destination = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, buffer);
    return { url: `/uploads/${key}` };
  }
}
