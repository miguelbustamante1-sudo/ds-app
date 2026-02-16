/**
 * Notification Repository
 * Database access layer for notification operations
 */

import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';

// Include clause for joining Notification → Category
const includeNotificationWithCategory = {
  notification: {
    include: {
      category: true,
    },
  },
};

// --- Resolution Helpers ---

/** Resolve userId values from team member IDs */
export async function getUserIdsByTeamMemberIds(teamMemberIds: number[]): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { teamMemberId: { in: teamMemberIds } },
    select: { userId: true },
  });
  return users.map((u) => u.userId);
}

/** Get sent broadcasts with read statistics */
export async function getSentBroadcasts(createdBy: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      createdBy,
      itemType: 'item-1',
      recipients: {
        some: { actionType: 'required' },
      },
    },
    include: {
      recipients: {
        select: {
          isRead: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return notifications.map((n) => ({
    notificationId: n.id,
    title: (n.payload as Record<string, unknown>).title as string,
    text: (n.payload as Record<string, unknown>).text as string,
    createdAt: n.createdAt.toISOString(),
    totalRecipients: n.recipients.length,
    readCount: n.recipients.filter((r) => r.isRead).length,
  }));
}

/** Get recipients for a specific broadcast notification */
export async function getBroadcastRecipients(notificationId: number) {
  const recipients = await prisma.recipient.findMany({
    where: { notificationId },
    include: {
      user: {
        select: { userName: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  return recipients.map((r) => ({
    userName: r.user.userName,
    isRead: r.isRead,
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

// --- Read Operations ---

/** Get notifications for a user, with optional category, unread, and status filters */
export async function getNotificationsForUser(
  userId: number,
  categoryName?: string,
  unreadOnly?: boolean,
  status?: 'unread' | 'read' | 'archived'
) {
  // Build where clause based on status (takes precedence) or legacy filters
  let statusFilter: Record<string, boolean> = {};
  if (status === 'unread') {
    statusFilter = { isArchived: false, isRead: false };
  } else if (status === 'read') {
    statusFilter = { isArchived: false, isRead: true };
  } else if (status === 'archived') {
    statusFilter = { isArchived: true };
  } else {
    // Default: existing behavior (non-archived, optionally unread only)
    statusFilter = { isArchived: false, ...(unreadOnly ? { isRead: false } : {}) };
  }

  return prisma.recipient.findMany({
    where: {
      userId,
      ...statusFilter,
      ...(categoryName
        ? {
            notification: {
              category: {
                name: categoryName,
              },
            },
          }
        : {}),
    },
    include: includeNotificationWithCategory,
    orderBy: {
      notification: {
        createdAt: 'desc',
      },
    },
  });
}

/** Get unread count for a user */
export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.recipient.count({
    where: {
      userId,
      isRead: false,
      isArchived: false,
    },
  });
}

/** Find category by name */
export async function getCategoryByName(name: string) {
  return prisma.category.findFirst({
    where: { name },
  });
}

// --- Write Operations ---

/** Create a notification with recipients (single transaction) */
export async function createNotificationWithRecipients(
  categoryId: number | null,
  itemType: string,
  payload: Record<string, unknown>,
  createdBy: string | null,
  recipients: Array<{ userId: number; actionType: string }>
) {
  return prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        categoryId,
        itemType,
        payload: payload as Prisma.InputJsonValue,
        createdBy,
      },
    });

    await tx.recipient.createMany({
      data: recipients.map((r) => ({
        notificationId: notification.id,
        userId: r.userId,
        actionType: r.actionType,
      })),
    });

    return notification;
  });
}

/** Mark a single recipient record as read */
export async function markAsRead(recipientId: number, userId: number) {
  return prisma.recipient.updateMany({
    where: {
      id: recipientId,
      userId, // ownership check
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/** Mark all notifications as read for a user */
export async function markAllAsRead(userId: number) {
  return prisma.recipient.updateMany({
    where: {
      userId,
      isRead: false,
      isArchived: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/** Archive a single recipient record */
export async function archiveRecipient(recipientId: number, userId: number) {
  return prisma.recipient.updateMany({
    where: {
      id: recipientId,
      userId, // ownership check
    },
    data: {
      isArchived: true,
    },
  });
}

/** Archive all notifications for a user */
export async function archiveAll(userId: number) {
  return prisma.recipient.updateMany({
    where: {
      userId,
      isArchived: false,
    },
    data: {
      isArchived: true,
    },
  });
}

/** Mark a single recipient record as unread */
export async function markAsUnread(recipientId: number, userId: number) {
  return prisma.recipient.updateMany({
    where: {
      id: recipientId,
      userId, // ownership check
    },
    data: {
      isRead: false,
      readAt: null,
    },
  });
}

/** Mark all read non-archived notifications as unread for a user */
export async function markAllAsUnread(userId: number) {
  return prisma.recipient.updateMany({
    where: {
      userId,
      isRead: true,
      isArchived: false,
    },
    data: {
      isRead: false,
      readAt: null,
    },
  });
}

/** Unarchive a single recipient record */
export async function unarchiveRecipient(recipientId: number, userId: number) {
  return prisma.recipient.updateMany({
    where: {
      id: recipientId,
      userId, // ownership check
    },
    data: {
      isArchived: false,
    },
  });
}

/** Unarchive all archived notifications for a user */
export async function unarchiveAll(userId: number) {
  return prisma.recipient.updateMany({
    where: {
      userId,
      isArchived: true,
    },
    data: {
      isArchived: false,
    },
  });
}

/** Get notification counts by status for a user */
export async function getCountsByStatus(userId: number) {
  const [unread, read, archived] = await Promise.all([
    prisma.recipient.count({
      where: { userId, isRead: false, isArchived: false },
    }),
    prisma.recipient.count({
      where: { userId, isRead: true, isArchived: false },
    }),
    prisma.recipient.count({
      where: { userId, isArchived: true },
    }),
  ]);
  return { unread, read, archived };
}
