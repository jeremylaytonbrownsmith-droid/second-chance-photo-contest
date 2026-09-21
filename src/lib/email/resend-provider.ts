import { Resend } from "resend";
import type { EmailProvider, SendEmailInput } from "./provider";

export class ResendEmailProvider implements EmailProvider {
  private client: Resend | null = null;

  private getClient(): Resend {
    if (this.client) return this.client;
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    this.client = new Resend(key);
    return this.client;
  }

  async send(input: SendEmailInput): Promise<void> {
    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM is not set");
    const { error } = await this.getClient().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
}
