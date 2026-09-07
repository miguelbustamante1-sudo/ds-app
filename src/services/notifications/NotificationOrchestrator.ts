/**
 * Notification Orchestrator
 * Coordinates all operations for the notification system
 */

import {
  getNotificationsForUser,
  getUnreadCount,
  getCategoryByName,
  createNotificationWithRecipients,
  markAsRead,
  markAllAsRead,
  markAsUnread as repoMarkAsUnread,
  markAllAsUnread as repoMarkAllAsUnread,
  archiveRecipient,
  archiveAll,
  unarchiveRecipient,
  unarchiveAll as repoUnarchiveAll,
  getCountsByStatus as repoGetCountsByStatus,
  getUserIdsByTeamMemberIds,
  getSentBroadcasts,
  getBroadcastRecipients,
  getUserEmailById,
  getRecipientById,
} from './repository';
import { getTeamMembersBySupervisor } from '../../db/teamMembers';
import { emailOrchestrator } from '../email';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { validatePayload, PayloadValidationError } from './components/ValidatePayload';
import type { CreateNotificationDTO, NotificationDTO, UnreadCountDTO } from '@shared/dto/Notification';
import type { RecipientWithNotification } from './types';

export { PayloadValidationError } from './components/ValidatePayload';

/** Map a raw Prisma recipient row to a NotificationDTO */
function toNotificationDTO(row: RecipientWithNotification): NotificationDTO {
  return {
    id: row.id,
    notificationId: row.notification.id,
    categoryName: row.notification.category?.name ?? null,
    itemType: row.notification.itemType,
    payload: row.notification.payload as Record<string, unknown>,
    createdAt: row.notification.createdAt.toISOString(),
    actionType: row.actionType,
    isRead: row.isRead,
    isArchived: row.isArchived,
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

export class NotificationOrchestrator {
  /** Get notifications for authenticated user */
  async getForUser(
    userId: number,
    categoryName?: string,
    unreadOnly?: boolean,
    status?: 'unread' | 'read' | 'archived'
  ): Promise<NotificationDTO[]> {
    const rows = await getNotificationsForUser(userId, categoryName, unreadOnly, status);
    return (rows as RecipientWithNotification[]).map(toNotificationDTO);
  }

  /** Get unread count for authenticated user */
  async getUnreadCount(userId: number): Promise<UnreadCountDTO> {
    const count = await getUnreadCount(userId);
    return { count };
  }

  /** Create a notification and assign to recipients */
  async create(dto: CreateNotificationDTO): Promise<void> {
    // 1. Resolve category by name → get categoryId
    let categoryId: number | null = null;
    if (dto.categoryName) {
      const category = await getCategoryByName(dto.categoryName);
      categoryId = category?.id ?? null;
    }

    // 2. Validate payload against item type
    validatePayload(dto.itemType, dto.payload);

    // 3. Create notification + recipients in transaction
    const recipients = dto.recipients.map((r) => ({
      userId: r.userId,
      actionType: r.actionType ?? 'readonly',
    }));

    await createNotificationWithRecipients(
      categoryId,
      dto.itemType,
      dto.payload,
      dto.createdBy ?? null,
      recipients
    );

    // 4. Fire-and-forget email — not awaited, so create() returns immediately regardless of SES outcome
    if (dto.emailSubject) {
      const emailSubject = dto.emailSubject;
      void Promise.allSettled(
        recipients.map(async (recipient) => {
          const email = await getUserEmailById(recipient.userId);
          if (email) {
            await emailOrchestrator.send({
              to: email,
              subject: emailSubject,
              body: dto.emailBody ?? '',
              isHtml: dto.emailIsHtml ?? false,
            });
          }
        })
      );
    }
  }

  /** Mark a notification as read for user */
  async markAsRead(recipientId: number, userId: number, createdBy: string): Promise<void> {
    const old = await getRecipientById(recipientId, userId);
    await markAsRead(recipientId, userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(recipientId),
      createdBy,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: old
        ? ({ ...old, isRead: true, readAt: new Date().toISOString() } as unknown as Record<string, unknown>)
        : null,
      comment: 'Notification marked as read',
    });
  }

  /** Mark all notifications as read for user */
  async markAllAsRead(userId: number, createdBy: string): Promise<void> {
    await markAllAsRead(userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(userId),
      createdBy,
      oldValues: null,
      newValues: { action: 'mark-all-as-read', userId, isRead: true } as unknown as Record<string, unknown>,
      comment: 'All unread notifications marked as read',
    });
  }

  /** Archive a notification for user */
  async archive(recipientId: number, userId: number, createdBy: string): Promise<void> {
    const old = await getRecipientById(recipientId, userId);
    await archiveRecipient(recipientId, userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(recipientId),
      createdBy,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: old
        ? ({ ...old, isArchived: true } as unknown as Record<string, unknown>)
        : null,
      comment: 'Notification archived',
    });
  }

  /** Archive all notifications for user */
  async archiveAll(userId: number, createdBy: string): Promise<void> {
    await archiveAll(userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(userId),
      createdBy,
      oldValues: null,
      newValues: { action: 'archive-all', userId, isArchived: true } as unknown as Record<string, unknown>,
      comment: 'All notifications archived',
    });
  }

  /** Mark a notification as unread for user */
  async markAsUnread(recipientId: number, userId: number, createdBy: string): Promise<void> {
    const old = await getRecipientById(recipientId, userId);
    await repoMarkAsUnread(recipientId, userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(recipientId),
      createdBy,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: old
        ? ({ ...old, isRead: false, readAt: null } as unknown as Record<string, unknown>)
        : null,
      comment: 'Notification marked as unread',
    });
  }

  /** Mark all read notifications as unread for user */
  async markAllAsUnread(userId: number, createdBy: string): Promise<void> {
    await repoMarkAllAsUnread(userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(userId),
      createdBy,
      oldValues: null,
      newValues: { action: 'mark-all-as-unread', userId, isRead: false } as unknown as Record<string, unknown>,
      comment: 'All read notifications marked as unread',
    });
  }

  /** Unarchive a notification for user */
  async unarchive(recipientId: number, userId: number, createdBy: string): Promise<void> {
    const old = await getRecipientById(recipientId, userId);
    await unarchiveRecipient(recipientId, userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(recipientId),
      createdBy,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: old
        ? ({ ...old, isArchived: false } as unknown as Record<string, unknown>)
        : null,
      comment: 'Notification unarchived',
    });
  }

  /** Unarchive all archived notifications for user */
  async unarchiveAll(userId: number, createdBy: string): Promise<void> {
    await repoUnarchiveAll(userId);
    await auditOrchestrator.log({
      entityName: 'rec_recipients',
      entityId: String(userId),
      createdBy,
      oldValues: null,
      newValues: { action: 'unarchive-all', userId, isArchived: false } as unknown as Record<string, unknown>,
      comment: 'All archived notifications unarchived',
    });
  }

  /** Get notification counts by status for user */
  async getCountsByStatus(userId: number): Promise<{ unread: number; read: number; archived: number }> {
    return repoGetCountsByStatus(userId);
  }

  /** Broadcast a notification to all team members under a supervisor */
  async broadcastToTeam(
    supervisorTeamMemberId: number,
    payload: Record<string, unknown>,
    categoryName: string,
    createdBy: string | null
  ): Promise<void> {
    // 1. Get supervised team members
    const teamMembers = await getTeamMembersBySupervisor(supervisorTeamMemberId);
    if (teamMembers.length === 0) {
      throw new Error('No team members found for this supervisor');
    }

    // 2. Resolve team member IDs to user IDs
    const teamMemberIds = teamMembers.map((tm) => tm.teamMemberId);
    const userIds = await getUserIdsByTeamMemberIds(teamMemberIds);
    if (userIds.length === 0) {
      throw new Error('No users found for the supervised team members');
    }

    // 3. Resolve category
    let categoryId: number | null = null;
    if (categoryName) {
      const category = await getCategoryByName(categoryName);
      categoryId = category?.id ?? null;
    }

    // 4. Validate payload
    validatePayload('item-1', payload);

    // 5. Build recipients with actionType = 'required'
    const recipients = userIds.map((userId) => ({
      userId,
      actionType: 'required',
    }));

    // 6. Create single notification with all recipients
    await createNotificationWithRecipients(categoryId, 'item-1', payload, createdBy, recipients);
  }

  /** Get sent broadcasts for a user */
  async getSentBroadcasts(createdBy: string) {
    return getSentBroadcasts(createdBy);
  }

  /** Get recipients for a specific broadcast */
  async getBroadcastRecipients(notificationId: number) {
    return getBroadcastRecipients(notificationId);
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
