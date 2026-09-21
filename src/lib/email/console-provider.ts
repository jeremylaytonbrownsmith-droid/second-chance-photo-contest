import type { EmailProvider, SendEmailInput } from "./provider";

/** Dev/test default — logs instead of sending, so local work and CI never
 * depend on a real email account. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    console.log(
      `[email:console] to=${input.to} subject="${input.subject}"\n${input.text ?? input.html}`,
    );
  }
}
