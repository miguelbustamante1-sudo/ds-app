/**
 * Email Service – public input contract
 * Callers are responsible for resolving recipients and building content.
 * This service only handles the SES transport concern.
 */

export interface SendEmailDTO {
  /** One or more recipient email addresses */
  to: string | string[];
  /** Subject line */
  subject: string;
  /** Plain-text or HTML body — the caller decides which */
  body: string;
  /** When true the body is treated as HTML; defaults to false */
  isHtml?: boolean;
  /** Optional Reply-To address */
  replyTo?: string;
}
