/**
 * DTOs for Notification System
 * Maps notification data from com schema tables
 */

/** CategoryDTO - Notification category/tab */
export interface CategoryDTO {
  id: number;
  name: string;
  color: string | null;
}

/** NotificationDTO - Full notification with recipient state (returned to frontend) */
export interface NotificationDTO {
  id: number;               // rec_id (recipient record ID)
  notificationId: number;   // ntf_id
  categoryName: string | null;
  itemType: string;
  payload: Record<string, unknown>;
  createdAt: string;        // ISO 8601 string from ntf_created_at
  actionType: string;
  isRead: boolean;
  isArchived: boolean;
  readAt: string | null;
}

/** CreateNotificationDTO - Data required to create a notification */
export interface CreateNotificationDTO {
  categoryName: string;
  itemType: string;
  payload: Record<string, unknown>;
  recipients: CreateRecipientDTO[];
  createdBy?: string;
}

/** CreateRecipientDTO - Recipient assignment within a notification */
export interface CreateRecipientDTO {
  userId: number;
  actionType?: 'readonly' | 'actionable' | 'required';
}

/** UnreadCountDTO - Lightweight response for badge polling */
export interface UnreadCountDTO {
  count: number;
}

/** BroadcastAnnouncementDTO - Body for creating a broadcast */
export interface BroadcastAnnouncementDTO {
  title: string;
  text: string;
  icon?: string;
}

/** SentBroadcastDTO - Summary of a sent broadcast with read stats */
export interface SentBroadcastDTO {
  notificationId: number;
  title: string;
  text: string;
  createdAt: string;
  totalRecipients: number;
  readCount: number;
}

/** BroadcastRecipientDTO - Individual recipient read status */
export interface BroadcastRecipientDTO {
  userName: string;
  isRead: boolean;
  readAt: string | null;
}
