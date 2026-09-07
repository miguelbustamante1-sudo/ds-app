export interface SendEmailDTO {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  replyTo?: string;
}

export interface SendDataPointDTO {
  timestamp: string;
  deliveryAttempts: number;
  bounces: number;
  complaints: number;
  rejects: number;
}

export interface SendQuotaDTO {
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
}

export interface SendStatisticsReportDTO {
  dataPoints: SendDataPointDTO[];
  quota: SendQuotaDTO;
}

export interface MessageInsightsEventDTO {
  timestamp: string;
  type: string;
  bounceType?: string;
  bounceSubType?: string;
  complaintSubType?: string;
}

export interface MessageInsightsDestinationDTO {
  destination?: string;
  isp?: string;
  events: MessageInsightsEventDTO[];
}

export interface MessageInsightsDTO {
  messageId: string;
  fromEmailAddress?: string;
  subject?: string;
  insights: MessageInsightsDestinationDTO[];
}
