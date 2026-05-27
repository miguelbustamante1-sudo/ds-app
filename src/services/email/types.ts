export interface SendEmailDTO {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  replyTo?: string;
}
