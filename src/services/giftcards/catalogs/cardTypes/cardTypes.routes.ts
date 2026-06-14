import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { getCardTypes, getCardTypeById } from './GetCardTypes';
import { createCardType, validateCreateCardType, ValidationError } from './CreateCardType';
import { updateCardType, validateUpdateCardType } from './UpdateCardType';
import { deactivateCardType } from './DeactivateCardType';
import { auditOrchestrator } from '../../../audit/AuditOrchestrator';
import { error } from '../../../../logger';

const router = Router();

// GET /api/giftcards/catalogs/card-types
router.get(
  '/',
  requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await getCardTypes();
      res.json({ data: result });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch card types' });
    }
  },
);

// POST /api/giftcards/catalogs/card-types
router.post(
  '/',
  requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dsUserId = req.user?.dsUserId;
      if (!dsUserId) {
        res.status(401).json({ error: 'Authenticated user not found in directory' });
        return;
      }

      const input  = validateCreateCardType((req as Request).body as Record<string, unknown>, dsUserId);
      const result = await createCardType(input);

      await auditOrchestrator.log({
        entityName: 'tbl_gct_card_types',
        entityId:   String(result.cardTypeId),
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Card type "${result.cardTypeName}" created`,
      });

      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create card type' });
    }
  },
);

// PUT /api/giftcards/catalogs/card-types/:id
router.put(
  '/:id',
  requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await getCardTypeById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Card type ${id} not found` });
        return;
      }

      const input  = validateUpdateCardType((req as Request).body as Record<string, unknown>);
      const result = await updateCardType(id, input);
      if (!result) {
        res.status(404).json({ error: `Card type ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gct_card_types',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Card type "${result.cardTypeName}" updated`,
      });

      res.json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update card type' });
    }
  },
);

// DELETE /api/giftcards/catalogs/card-types/:id
router.delete(
  '/:id',
  requirePermission('GiftCardCatalog', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await getCardTypeById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Card type ${id} not found` });
        return;
      }

      const deactivated = await deactivateCardType(id);
      if (!deactivated) {
        res.status(404).json({ error: `Card type ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gct_card_types',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  { ...oldRecord, cardTypeIsActive: false } as unknown as Record<string, unknown>,
        comment:    `Card type "${oldRecord.cardTypeName}" deactivated`,
      });

      res.status(204).send();
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to deactivate card type' });
    }
  },
);

export default router;