import type { ModerationProvider, ModerationResult } from "./provider";

/** Default provider — no account configured, so nothing is actually
 * screened. Exists so the rest of the app always has a provider to call
 * (same reasoning as the mock payment provider), and so "no real
 * screening is happening" is one grep away instead of a silent gap. */
export class NoopModerationProvider implements ModerationProvider {
  readonly name = "NOOP";

  async screenImage(): Promise<ModerationResult> {
    return { flagged: false, flags: [] };
  }
}
