import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import {
  AuthenticatedRequest,
  requirePermission,
} from '../../../middleware/auth';
import { workflowTemplateOrchestrator } from '../WorkflowTemplateOrchestrator';

const router = Router();

// Safe access: every route is guarded by requirePermission which calls next(401) if
// req.user is absent, so req.user is guaranteed to be populated inside handlers.
function userId(req: AuthenticatedRequest): string {
  return req.user?.dsUserId?.toString() ?? '';
}
function userEmail(req: AuthenticatedRequest): string {
  return req.user?.email ?? '';
}

function catchHandler(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

router.post(
  '/',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.createTemplate(
        req.body as {
          code: string;
          name: string;
          description?: string;
          versionNo: number;
          wecId?: string;
          effectiveFrom?: Date;
          effectiveTo?: Date;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/',
  requirePermission('Workflow', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, status, isActive } = req.query;
      const result = await workflowTemplateOrchestrator.listTemplates({
        ...(typeof code === 'string' && { code }),
        ...(typeof status === 'string' && { status }),
        ...(typeof isActive === 'string' && { isActive: isActive === 'true' }),
      });
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/:wflId',
  requirePermission('Workflow', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.getTemplate(req.params.wflId ?? '');
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.patch(
  '/:wflId',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.updateTemplate(
        req.params.wflId ?? '',
        req.body as {
          name?: string;
          description?: string;
          versionNo?: number;
          wecId?: string;
          effectiveFrom?: Date;
          effectiveTo?: Date;
        },
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:wflId/publish',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.publishTemplate(
        req.params.wflId ?? '',
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:wflId/archive',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.archiveTemplate(
        req.params.wflId ?? '',
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/tasks',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addTask(
        req.params.wflId ?? '',
        req.body as {
          code: string;
          name: string;
          description?: string;
          sequenceNo?: number;
          taskType: string;
          assignmentType: string;
          assignedUserId?: number;
          assignedRoleId?: string;
          dynamicAssignmentType?: string;
          priority: string;
          slaDurationHours?: number;
          escalationUserId?: number;
          escalationRoleId?: string;
          escalationDynamicType?: string;
          maxRetryCount?: number;
          allowReassignment?: boolean;
          requireCommentOnReassign?: boolean;
          allowFail?: boolean;
          isStartingTask?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.patch(
  '/:wflId/tasks/:wtkId',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.updateTask(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.body as {
          code?: string;
          name?: string;
          description?: string;
          sequenceNo?: number;
          taskType?: string;
          assignmentType?: string;
          assignedUserId?: number;
          assignedRoleId?: string;
          dynamicAssignmentType?: string;
          priority?: string;
          slaDurationHours?: number;
          escalationUserId?: number;
          escalationRoleId?: string;
          escalationDynamicType?: string;
          maxRetryCount?: number;
          allowReassignment?: boolean;
          requireCommentOnReassign?: boolean;
          allowFail?: boolean;
          isStartingTask?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/tasks/:wtkId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeTask(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/tasks/:wtkId/inputs',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addInput(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.body as {
          code: string;
          label: string;
          description?: string;
          dataType: string;
          isRequired?: boolean;
          isRoutingInput?: boolean;
          displayOrder?: number;
          defaultValue?: string;
          validationRule?: string;
          optionSetJson?: Prisma.InputJsonValue;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.patch(
  '/:wflId/tasks/:wtkId/inputs/:wtiId',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.updateInput(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.params.wtiId ?? '',
        req.body as {
          code?: string;
          label?: string;
          description?: string;
          dataType?: string;
          isRequired?: boolean;
          isRoutingInput?: boolean;
          displayOrder?: number;
          defaultValue?: string;
          validationRule?: string;
          optionSetJson?: Prisma.InputJsonValue;
        },
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/tasks/:wtkId/inputs/:wtiId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeInput(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.params.wtiId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/tasks/:wtkId/outcomes',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addOutcome(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.body as {
          code: string;
          label: string;
          description?: string;
          isTerminal?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/tasks/:wtkId/outcomes/:wtoId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeOutcome(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.params.wtoId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/routes',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addRoute(
        req.params.wflId ?? '',
        req.body as {
          wtkFromId: string;
          wtoId?: string;
          wtkToId: string;
          conditionType: string;
          routeOrder?: number;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/routes/:wtrId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeRoute(
        req.params.wflId ?? '',
        req.params.wtrId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/dependencies',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addDependency(
        req.params.wflId ?? '',
        req.body as {
          wtkPredecessorId: string;
          wtkSuccessorId: string;
          dependencyType: string;
          joinGroupCode?: string;
          isRequired?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/dependencies/:wtdId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeDependency(
        req.params.wflId ?? '',
        req.params.wtdId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

router.post(
  '/:wflId/tasks/:wtkId/notifications',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.addNotification(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.body as {
          eventType: string;
          recipientType: string;
          recipientUserId?: number;
          recipientRoleId?: string;
          recipientDynamicType?: string;
          messageTemplate: string;
          emailTemplate?: string;
          isActive?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.patch(
  '/:wflId/tasks/:wtkId/notifications/:wtnId',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await workflowTemplateOrchestrator.updateNotification(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.params.wtnId ?? '',
        req.body as {
          eventType?: string;
          recipientType?: string;
          recipientUserId?: number;
          recipientRoleId?: string;
          recipientDynamicType?: string;
          messageTemplate?: string;
          emailTemplate?: string;
          isActive?: boolean;
        },
        userId(req),
        userEmail(req),
      );
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:wflId/tasks/:wtkId/notifications/:wtnId',
  requirePermission('Workflow', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await workflowTemplateOrchestrator.removeNotification(
        req.params.wflId ?? '',
        req.params.wtkId ?? '',
        req.params.wtnId ?? '',
        userId(req),
        userEmail(req),
      );
      res.status(204).send();
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

export default router;
