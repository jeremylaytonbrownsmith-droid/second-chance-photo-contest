import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { StorageProvider, UploadInput, UploadResult } from "./provider";

let client: S3Client | null = null;

function r2Client(): S3Client {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required for the R2 storage provider",
    );
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/** Cloudflare R2 (S3-compatible) — zero egress fees, which matters for an
 * image-heavy app that gets hit from social-media share links. */
export class R2StorageProvider implements StorageProvider {
  async upload({ key, buffer, contentType }: UploadInput): Promise<UploadResult> {
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!bucket || !publicUrl) {
      throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL are required for the R2 storage provider");
    }
    await r2Client().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
    );
    return { url: `${publicUrl.replace(/\/$/, "")}/${key}` };
  }
}
