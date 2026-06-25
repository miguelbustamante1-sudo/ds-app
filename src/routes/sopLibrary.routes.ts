import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { sopLibraryOrchestrator } from '../services/sopLibrary/SopLibraryOrchestrator';
import type { CreateSopLibraryItemInput, UpdateSopLibraryItemInput } from '../services/sopLibrary/types';

const router = Router();

function requireAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user?.roles.includes('admin')) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

// GET /api/sop-library — items visible to the requesting user based on their tier
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = req.user?.roles ?? [];
    const items = await sopLibraryOrchestrator.listForUser(roles);
    res.json({ data: items });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sop-library/all — admin: all items including inactive
router.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const items = await sopLibraryOrchestrator.listAll();
    res.json({ data: items });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sop-library — admin: create item
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const dsUserId = req.user?.dsUserId;
    if (!dsUserId) throw new AppError('Unauthenticated', 401);
    const userEmail = req.user?.email ?? '';

    const input: CreateSopLibraryItemInput = {
      sliName:      req.body.sliName,
      sliGoogleUrl: req.body.sliGoogleUrl,
      sliCategory:  req.body.sliCategory ?? null,
      sliMinTier:   Number(req.body.sliMinTier),
    };

    const item = await sopLibraryOrchestrator.create(input, dsUserId, userEmail);
    res.status(201).json({ data: item });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sop-library/:id — admin: update item
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid ID', 400);

    const dsUserId = req.user?.dsUserId;
    if (!dsUserId) throw new AppError('Unauthenticated', 401);
    const userEmail = req.user?.email ?? '';

    const input: UpdateSopLibraryItemInput = {};
    if (req.body.sliName      !== undefined) input.sliName      = req.body.sliName;
    if (req.body.sliGoogleUrl !== undefined) input.sliGoogleUrl = req.body.sliGoogleUrl;
    if (req.body.sliCategory  !== undefined) input.sliCategory  = req.body.sliCategory;
    if (req.body.sliMinTier   !== undefined) input.sliMinTier   = Number(req.body.sliMinTier);
    if (req.body.sliActive    !== undefined) input.sliActive    = Boolean(req.body.sliActive);

    const item = await sopLibraryOrchestrator.update(id, input, dsUserId, userEmail);
    res.json({ data: item });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sop-library/:id — admin: soft-delete item
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid ID', 400);

    const dsUserId = req.user?.dsUserId;
    if (!dsUserId) throw new AppError('Unauthenticated', 401);
    const userEmail = req.user?.email ?? '';

    await sopLibraryOrchestrator.delete(id, dsUserId, userEmail);
    res.status(204).send();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
