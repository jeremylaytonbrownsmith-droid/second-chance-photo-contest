import type { ModerationProvider, ModerationResult } from "./provider";

const MODEL = "claude-haiku-5-5";

interface ClassificationResult {
  nudity: boolean;
  violence: boolean;
  containsPet: boolean;
}

function parseClassification(text: string): ClassificationResult {
  // Claude is asked to respond with only JSON, but strip any stray
  // markdown fencing defensively rather than trust that instruction held.
  const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(jsonText) as Partial<ClassificationResult>;
  return {
    nudity: parsed.nudity === true,
    violence: parsed.violence === true,
    containsPet: parsed.containsPet !== false, // default to true — a parsing miss shouldn't flag every photo as petless
  };
}

/** One Claude vision call covers both screening items from the client's
 * list — nudity/violence *and* "is this actually a pet" — instead of
 * needing two separate provider calls the way Google Vision's SafeSearch
 * (nudity/violence) and Label Detection (pet check) would. Needs
 * ANTHROPIC_API_KEY. Untested against the live API — no credentials exist
 * in this environment to verify the request/response shape end to end;
 * verify with one real image before relying on this in production. */
export class ClaudeModerationProvider implements ModerationProvider {
  readonly name = "CLAUDE";

  async screenImage(buffer: Buffer, contentType: string): Promise<ModerationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set — required for the Claude moderation provider");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: contentType, data: buffer.toString("base64") } },
              {
                type: "text",
                text:
                  "This photo was uploaded to a nonprofit pet photo contest. Respond with ONLY a JSON object, " +
                  'no other text: {"nudity": boolean, "violence": boolean, "containsPet": boolean}. ' +
                  '"nudity" is true only for actual nudity/sexual content, not e.g. a shirtless person incidentally ' +
                  'in frame. "violence" is true only for actual violence or gore. "containsPet" is true if the ' +
                  "photo shows a recognizable dog or cat.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude moderation request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) {
      throw new Error("Claude moderation response had no text content");
    }

    const result = parseClassification(text);
    const flags: string[] = [];
    if (result.nudity) flags.push("possible_nudity");
    if (result.violence) flags.push("possible_violence");
    if (!result.containsPet) flags.push("no_pet_detected");

    return { flagged: flags.length > 0, flags };
  }
}
