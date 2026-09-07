import express from 'express';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../db/users';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /users
router.get('/', requirePermission('Users', 'read'), async (req: Request, res: Response) => {
  try {
    const users: User[] = await getAllUsers();
    res.json(users);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id
router.get('/:id', requirePermission('Users', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const user = await getUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /users
router.post('/', requirePermission('Users', 'create'), async (req: Request, res: Response) => {
  try {
    const { userName, userEmail, userRole, userStartDate, userEndDate, teamMemberId } = req.body as {
      userName?: string;
      userEmail?: string;
      userRole?: string;
      userStartDate?: string;
      userEndDate?: string | null;
      teamMemberId?: number | null;
    };

    if (!userName || typeof userName !== 'string') return res.status(400).json({ error: 'userName is required' });
    if (!userEmail || typeof userEmail !== 'string') return res.status(400).json({ error: 'userEmail is required' });
    if (!userRole || typeof userRole !== 'string') return res.status(400).json({ error: 'userRole is required' });
    if (!userStartDate || typeof userStartDate !== 'string') return res.status(400).json({ error: 'userStartDate is required' });

    const endDate = typeof userEndDate === 'string' ? userEndDate : null;
    const tmsId = typeof teamMemberId === 'number' ? teamMemberId : null;
    const created = await createUser(userName, userEmail, userRole, userStartDate, endDate, tmsId);
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /users/:id
router.put('/:id', requirePermission('Users', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { userName, userEmail, userRole, userStartDate, userEndDate, teamMemberId } = req.body as {
      userName?: string;
      userEmail?: string;
      userRole?: string;
      userStartDate?: string;
      userEndDate?: string | null;
      teamMemberId?: number | null;
    };

    if (!userName || typeof userName !== 'string') return res.status(400).json({ error: 'userName is required' });
    if (!userEmail || typeof userEmail !== 'string') return res.status(400).json({ error: 'userEmail is required' });
    if (!userRole || typeof userRole !== 'string') return res.status(400).json({ error: 'userRole is required' });
    if (!userStartDate || typeof userStartDate !== 'string') return res.status(400).json({ error: 'userStartDate is required' });

    const endDate = typeof userEndDate === 'string' ? userEndDate : null;
    const tmsId = typeof teamMemberId === 'number' ? teamMemberId : null;
    const updated = await updateUser(id, userName, userEmail, userRole, userStartDate, endDate, tmsId);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /users/:id
router.delete('/:id', requirePermission('Users', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteUser(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
