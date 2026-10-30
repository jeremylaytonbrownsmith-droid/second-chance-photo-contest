import type { ModerationProvider, ModerationResult } from "./provider";

/** Likelihoods Vision's SafeSearch API returns, worst to best. Flagging on
 * POSSIBLE and up (not just LIKELY/VERY_LIKELY) is deliberately
 * conservative — a false positive costs an admin a second look; a false
 * negative costs a bad photo going live. */
const FLAG_AT = new Set(["POSSIBLE", "LIKELY", "VERY_LIKELY"]);

interface SafeSearchAnnotation {
  adult?: string;
  violence?: string;
  racy?: string;
}

/** Google Cloud Vision's SafeSearch Detection — needs GOOGLE_VISION_API_KEY
 * (an API key from a GCP project with the Vision API enabled; no service
 * account JSON needed for this simple REST call). Untested against the
 * real API — no credentials exist in this environment to verify the
 * request/response shape end to end. Verify with one real image before
 * relying on this in production. */
export class GoogleVisionModerationProvider implements ModerationProvider {
  readonly name = "GOOGLE_VISION";

  async screenImage(buffer: Buffer): Promise<ModerationResult> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_VISION_API_KEY is not set — required for the Google Vision moderation provider");
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: buffer.toString("base64") },
            features: [{ type: "SAFE_SEARCH_DETECTION" }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { responses?: Array<{ safeSearchAnnotation?: SafeSearchAnnotation }> };
    const safeSearch = data.responses?.[0]?.safeSearchAnnotation ?? {};

    const flags: string[] = [];
    if (safeSearch.adult && FLAG_AT.has(safeSearch.adult)) flags.push("possible_nudity");
    if (safeSearch.violence && FLAG_AT.has(safeSearch.violence)) flags.push("possible_violence");
    if (safeSearch.racy && FLAG_AT.has(safeSearch.racy)) flags.push("possible_racy_content");

    return { flagged: flags.length > 0, flags };
  }
}
