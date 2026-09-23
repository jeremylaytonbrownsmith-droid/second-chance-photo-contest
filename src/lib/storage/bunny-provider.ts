import type { StorageProvider, UploadInput, UploadResult } from "./provider";

/**
 * Bunny.net Storage — not S3-compatible (unlike R2), so this talks to
 * Bunny's own plain-REST upload API directly rather than through the AWS
 * SDK. Files are pushed to a Storage Zone; a Pull Zone (Bunny's CDN) in
 * front of that zone is what actually serves them publicly — set
 * BUNNY_PULL_ZONE_URL to that Pull Zone's hostname, not the storage API
 * host, or uploaded photos will save fine but their photoUrl won't load.
 */
export class BunnyStorageProvider implements StorageProvider {
  async upload({ key, buffer, contentType }: UploadInput): Promise<UploadResult> {
    const storageZone = process.env.BUNNY_STORAGE_ZONE;
    const apiKey = process.env.BUNNY_STORAGE_API_KEY;
    const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;
    if (!storageZone || !apiKey || !pullZoneUrl) {
      throw new Error(
        "BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, and BUNNY_PULL_ZONE_URL are required for the Bunny storage provider",
      );
    }

    // Regional storage endpoints (e.g. "ny.storage.bunnycdn.com") are
    // optional in Bunny's dashboard — BUNNY_STORAGE_REGION lets a deploy
    // pick one; the default main endpoint works for every storage zone
    // regardless of region.
    const region = process.env.BUNNY_STORAGE_REGION;
    const host = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";

    const response = await fetch(`https://${host}/${storageZone}/${key}`, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": contentType,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Bunny Storage upload failed (${response.status}): ${body || response.statusText}`);
    }

    return { url: `${pullZoneUrl.replace(/\/$/, "")}/${key}` };
  }
}
