export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
