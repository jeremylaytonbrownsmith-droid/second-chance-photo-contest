import type { ModerationProvider } from "./provider";
import { NoopModerationProvider } from "./noop-provider";
import { GoogleVisionModerationProvider } from "./google-vision-provider";
import { ClaudeModerationProvider } from "./claude-provider";

export type { ModerationProvider, ModerationResult } from "./provider";

let cached: ModerationProvider | null = null;

export function getModerationProvider(): ModerationProvider {
  if (cached) return cached;
  const configured = (process.env.MODERATION_PROVIDER ?? "noop").toLowerCase();
  switch (configured) {
    case "claude":
      cached = new ClaudeModerationProvider();
      break;
    case "google_vision":
      cached = new GoogleVisionModerationProvider();
      break;
    case "noop":
      cached = new NoopModerationProvider();
      break;
    default:
      throw new Error(`Unknown MODERATION_PROVIDER "${configured}" — expected "noop", "claude", or "google_vision"`);
  }
  return cached;
}
