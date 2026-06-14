import { Router, Response } from 'express';
import { requirePermission } from '../../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { auditOrchestrator } from '../../../audit/AuditOrchestrator';
import { getCardValues } from './GetCardValues';
import { createCardValue, validateCreateCardValue, ValidationError } from './CreateCardValue';
import { updateCardValue, validateUpdateCardValue } from './UpdateCardValue';
import { deactivateCardValue } from './DeactivateCardValue';

const router = Router();

// GET /api/giftcards/catalogs/card-values
router.get('/', requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    const data = await getCardValues();
    res.json({ data });
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
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues: result as unknown as Record<string, unknown>,
        comment:    `Card value created`,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }
);

// PUT /api/giftcards/catalogs/card-values/:id
router.put('/:id', requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    try {
      const input = validateUpdateCardValue(req.body);
      const result = await updateCardValue(id, input);
      if (!result) {
        res.status(404).json({ error: `Card value ${id} not found` });
        return;
      }
      await auditOrchestrator.log({
        entityName: 'tbl_gcv_card_values',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues: result as unknown as Record<string, unknown>,        comment:    `Card value updated`,
      });
      res.json({ data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE /api/giftcards/catalogs/card-values/:id
router.delete('/:id', requirePermission('GiftCardCatalog', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const found = await deactivateCardValue(id);
    if (!found) {
      res.status(404).json({ error: `Card value ${id} not found` });
      return;
    }
    await auditOrchestrator.log({
      entityName: 'tbl_gcv_card_values',
      entityId:   String(id),
      createdBy:  req.user!.email,
      oldValues:  null,
      newValues:  { cardValueIsActive: false },
      comment:    `Card value deactivated`,
    });
    res.status(204).send();
  }
);

export default router;