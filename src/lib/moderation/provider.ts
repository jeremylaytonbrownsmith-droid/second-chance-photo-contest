/**
 * Automated image-screening abstraction — every uploaded photo goes
 * through this before it reaches the moderation queue, same adapter
 * pattern as payments/storage. Real screening (Google Cloud Vision
 * SafeSearch, AWS Rekognition, Sightengine, Hive, etc.) needs a real
 * account and API credentials, which this app doesn't have yet — the
 * no-op provider is the safe default until one is configured, and it says
 * so explicitly rather than silently pretending to screen anything.
 */

export interface ModerationResult {
  /** True if the provider thinks a human should look twice before this
   * goes live — never auto-rejects by itself, only flags for the queue. */
  flagged: boolean;
  /** Short machine-readable flags, e.g. "possible_nudity", "violence",
   * "no_animal_detected" — stored on Entry.moderationFlags, shown in the
   * moderation queue. Empty when nothing was flagged. */
  flags: string[];
}

export interface ModerationProvider {
  readonly name: string;
  screenImage(buffer: Buffer, contentType: string): Promise<ModerationResult>;
}
