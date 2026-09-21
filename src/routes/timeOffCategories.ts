import express from 'express';
import type { Response } from 'express';
import type { TimeOffCategory } from '@prisma/client';
import type { CategoryByCountryDTO } from '../../shared/dto';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByCountry,
  getCategoriesByTeamMemberId,
} from '../db/timeOffCategories';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit';

const router = express.Router();

// GET /categories
router.get('/', requirePermission('TimeOffCategories', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories: TimeOffCategory[] = await getAllCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /categories/my-categories
// Returns categories available for the current authenticated user based on their country
// Response includes category-country configuration (half-day, fixed duration settings)
router.get('/my-categories', requirePermission('TimeOffCategories', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const categories: CategoryByCountryDTO[] | null = await getCategoriesByTeamMemberId(teamMemberId);
    if (categories === null) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories for current user' });
  }
});

// GET /categories/country/:countryIso
router.get('/country/:countryIso', requirePermission('TimeOffCategories', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { countryIso } = req.params;
    if (!countryIso || typeof countryIso !== 'string') return res.status(400).json({ error: 'Invalid countryIso' });

    const categories: CategoryByCountryDTO[] = await getCategoriesByCountry(countryIso);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch type of timeoff by country' });
  }
});

// GET /categories/team-member/:teamMemberId
// Returns categories available for a team member based on their country
// Response includes category-country configuration (half-day, fixed duration settings)
router.get('/team-member/:teamMemberId', requirePermission('TimeOffCategories', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = Number(req.params.teamMemberId);
    if (Number.isNaN(teamMemberId)) {
      return res.status(400).json({ error: 'Invalid teamMemberId' });
    }

    const categories: CategoryByCountryDTO[] | null = await getCategoriesByTeamMemberId(teamMemberId);
    if (categories === null) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch types of time-off for team member' });
  }
});

// GET /categories/:id
router.get('/:id', requirePermission('TimeOffCategories', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const category = await getCategoryById(id);
    if (!category) return res.status(404).json({ error: 'Type of time-off not found' });

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch type of time-off' });
  }
});

// POST /categories
router.post('/', requirePermission('TimeOffCategories', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryName, categoryShortName } = req.body as { categoryName?: string; categoryShortName?: string };
    if (!categoryName || typeof categoryName !== 'string') {
      return res.status(400).json({ error: 'categoryName is required' });
    }

    const created = await createCategory(categoryName, categoryShortName?.trim() || undefined);

    await auditOrchestrator.log({
      entityName: 'tot_time_off_types',
      entityId: String(created.categoryId),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: null,
      newValues: created,
      comment: `Time off type "${created.categoryName}" created`,
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create type of time-off' });
  }
});

// PUT /categories/:id
router.put('/:id', requirePermission('TimeOffCategories', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { categoryName, categoryShortName } = req.body as { categoryName?: string; categoryShortName?: string };
    if (!categoryName || typeof categoryName !== 'string') {
      return res.status(400).json({ error: 'categoryName is required' });
    }

    const before = await getCategoryById(id);
    const updated = await updateCategory(id, categoryName, categoryShortName?.trim() || undefined);
    if (!updated) return res.status(404).json({ error: 'Type of time-off not found' });

    await auditOrchestrator.log({
      entityName: 'tot_time_off_types',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before,
      newValues: updated,
      comment: `Time off type updated to "${updated.categoryName}"`,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update type of time-off' });
  }
});

// DELETE /categories/:id
router.delete('/:id', requirePermission('TimeOffCategories', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const before = await getCategoryById(id);
    await deleteCategory(id);

    await auditOrchestrator.log({
      entityName: 'tot_time_off_types',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before,
      newValues: null,
      comment: `Time off type "${before?.categoryName}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete type of time-off' });
  }
});

export default router;
