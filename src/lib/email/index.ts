import type { EmailProvider } from "./provider";
import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";

export type { EmailProvider, SendEmailInput } from "./provider";

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const configured = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  switch (configured) {
    case "resend":
      cached = new ResendEmailProvider();
      break;
    case "console":
      cached = new ConsoleEmailProvider();
      break;
    default:
      throw new Error(`Unknown EMAIL_PROVIDER "${configured}" — expected "console" or "resend"`);
  }
  return cached;
}
