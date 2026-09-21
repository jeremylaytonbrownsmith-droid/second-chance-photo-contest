/** Email provider abstraction — Resend in production, a console logger in
 * dev/tests so nothing tries to send real mail while iterating. */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
