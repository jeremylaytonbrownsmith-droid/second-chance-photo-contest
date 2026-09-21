import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local-provider";
import { R2StorageProvider } from "./r2-provider";

export type { StorageProvider, UploadInput, UploadResult } from "./provider";

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const configured = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  switch (configured) {
    case "r2":
      cached = new R2StorageProvider();
      break;
    case "local":
      cached = new LocalStorageProvider();
      break;
    default:
      throw new Error(`Unknown STORAGE_PROVIDER "${configured}" — expected "local" or "r2"`);
  }
  return cached;
}
