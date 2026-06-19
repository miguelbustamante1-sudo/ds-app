import { Router, Response } from 'express';
import { requirePermission } from '../../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { auditOrchestrator } from '../../../audit/AuditOrchestrator';
import { getCardValues, getCardValueById } from './GetCardValues';
import { createCardValue, validateCreateCardValue } from './CreateCardValue';
import { updateCardValue, validateUpdateCardValue } from './UpdateCardValue';
import { deactivateCardValue } from './DeactivateCardValue';
import { GiftCardValidationError } from '../../errors';
import { error } from '../../../../logger';

const router = Router();

// GET /api/giftcards/catalogs/card-values
router.get('/', requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await getCardValues();
      res.json({ data });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch card values' });
    }
  }
);

// POST /api/giftcards/catalogs/card-values
router.post('/', requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    const dsUserId = req.user?.dsUserId;
    if (!dsUserId) {
      res.status(401).json({ error: 'Authenticated user not found in directory' });
      return;
    }
    try {
      const input = validateCreateCardValue(req.body, dsUserId);
      const result = await createCardValue(input);
      await auditOrchestrator.log({
        entityName: 'tbl_gcv_card_values',
        entityId:   String(result.cardValueId),
        createdBy:  req.user!.email, // requirePermission guarantees req.user is set
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Card value created`,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof GiftCardValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create card value' });
    }
  }
);

// PUT /api/giftcards/catalogs/card-values/:id
router.put('/:id', requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    try {
      const oldRecord = await getCardValueById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Card value ${id} not found` });
        return;
      }
      const input = validateUpdateCardValue(req.body);
      const result = await updateCardValue(id, input);
      if (!result) {
        res.status(404).json({ error: `Card value ${id} not found` });
        return;
      }
      await auditOrchestrator.log({
        entityName: 'tbl_gcv_card_values',
        entityId:   String(id),
        createdBy:  req.user!.email, // requirePermission guarantees req.user is set
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Card value updated`,
      });
      res.json({ data: result });
    } catch (err) {
      if (err instanceof GiftCardValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update card value' });
    }
  }
);

// DELETE /api/giftcards/catalogs/card-values/:id
router.delete('/:id', requirePermission('GiftCardCatalog', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    try {
      const oldRecord = await getCardValueById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Card value ${id} not found` });
        return;
      }
      await deactivateCardValue(id);
      await auditOrchestrator.log({
        entityName: 'tbl_gcv_card_values',
        entityId:   String(id),
        createdBy:  req.user!.email, // requirePermission guarantees req.user is set
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  { ...oldRecord, cardValueIsActive: false } as unknown as Record<string, unknown>,
        comment:    `Card value deactivated`,
      });
      res.status(204).send();
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to deactivate card value' });
    }
  }
);

export default router;
