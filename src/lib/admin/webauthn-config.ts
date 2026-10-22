import { siteUrl } from "@/lib/site-url";

/** WebAuthn ties credentials to a specific domain (the "RP ID") and origin
 * — derived from the same siteUrl() everything else uses, so there's no
 * separate env var to keep in sync with it. "localhost" is a special case
 * the WebAuthn spec allows unencrypted, which is what makes this testable
 * in local dev without HTTPS. */
export function webauthnRpID(): string {
  return new URL(siteUrl()).hostname;
}

export function webauthnOrigin(): string {
  return siteUrl();
}

export const WEBAUTHN_RP_NAME = "Second Chance Pet Adoptions Admin";
