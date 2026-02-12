/**
 * Internal types for notification service
 * These types are used within the service layer and not exposed to consumers.
 */

/** Raw recipient row with joined notification and category from Prisma */
export interface RecipientWithNotification {
  id: number;
  notificationId: number;
  userId: number;
  actionType: string;
  isRead: boolean;
  isArchived: boolean;
  readAt: Date | null;
  notification: {
    id: number;
    categoryId: number | null;
    itemType: string;
    payload: unknown;
    createdAt: Date;
    createdBy: string | null;
    category: {
      id: number;
      name: string;
      color: string | null;
    } | null;
  };
}
