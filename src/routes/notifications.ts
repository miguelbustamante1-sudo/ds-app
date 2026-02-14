import express from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { notificationOrchestrator, PayloadValidationError } from '../services/notifications';

const router = express.Router();

// GET /notifications — Get notifications for current user
router.get('/', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    const category = req.query.category as string | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await notificationOrchestrator.getForUser(userId, category, unreadOnly);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /notifications/unread-count — Lightweight badge polling
router.get('/unread-count', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    const result = await notificationOrchestrator.getUnreadCount(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PATCH /notifications/:recipientId/read — Mark single as read
router.patch('/:recipientId/read', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    const recipientId = Number(req.params.recipientId);
    if (Number.isNaN(recipientId)) return res.status(400).json({ error: 'Invalid recipient ID' });

    await notificationOrchestrator.markAsRead(recipientId, userId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /notifications/read-all — Mark all as read
router.patch('/read-all', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    await notificationOrchestrator.markAllAsRead(userId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// PATCH /notifications/:recipientId/archive — Archive single
router.patch('/:recipientId/archive', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    const recipientId = Number(req.params.recipientId);
    if (Number.isNaN(recipientId)) return res.status(400).json({ error: 'Invalid recipient ID' });

    await notificationOrchestrator.archive(recipientId, userId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive notification' });
  }
});

// PATCH /notifications/archive-all — Archive all
router.patch('/archive-all', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.dsUserId;
    if (!userId) return res.status(404).json({ error: 'User not found in ds.tbl_users' });

    await notificationOrchestrator.archiveAll(userId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive all notifications' });
  }
});

// POST /notifications/broadcast — Send a broadcast announcement to the supervisor's team
router.post('/broadcast', requirePermission('Notifications', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) return res.status(401).json({ error: 'User not authenticated' });

    const { title, text, icon } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'Title and text are required' });

    const supervisorTeamMemberId = req.user?.teamMemberId;
    if (!supervisorTeamMemberId) return res.status(404).json({ error: 'Team member not found for current user' });

    const payload = {
      userName: 'System',
      title,
      text,
      icon: icon || 'shield-tick',
      avatar: '300-1.png',
    };

    await notificationOrchestrator.broadcastToTeam(supervisorTeamMemberId, payload, 'Inbox', authUserEmail);
    res.status(201).json({ message: 'Broadcast sent' });
  } catch (err) {
    if (err instanceof PayloadValidationError) {
      return res.status(400).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : 'Failed to send broadcast';
    res.status(500).json({ error: message });
  }
});

// GET /notifications/broadcast/sent — List announcements sent by the current user
router.get('/broadcast/sent', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) return res.status(401).json({ error: 'User not authenticated' });

    const broadcasts = await notificationOrchestrator.getSentBroadcasts(authUserEmail);
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sent broadcasts' });
  }
});

// GET /notifications/broadcast/:notificationId/recipients — Detail view of recipient read status
router.get('/broadcast/:notificationId/recipients', requirePermission('Notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.notificationId);
    if (Number.isNaN(notificationId)) return res.status(400).json({ error: 'Invalid notification ID' });

    const recipients = await notificationOrchestrator.getBroadcastRecipients(notificationId);
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch broadcast recipients' });
  }
});

// POST /notifications — Create a notification (admin/system only)
router.post('/', requirePermission('Notifications', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dto = req.body;
    await notificationOrchestrator.create(dto);
    res.status(201).json({ message: 'Notification created' });
  } catch (err) {
    if (err instanceof PayloadValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
