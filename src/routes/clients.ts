import express from 'express';
import type { Response } from 'express';
import type { Client } from '@prisma/client';
import type { CreateClientDTO, UpdateClientDTO } from '@shared/dto';
import { getAllClients, getClientById, createClient, updateClient, deleteClient } from '../db/clients';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /clients
router.get('/', requirePermission('Clients', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clients: Client[] = await getAllClients();
    res.json(clients);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /clients/:id
router.get('/:id', requirePermission('Clients', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const client = await getClientById(id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json(client);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /clients
router.post('/', requirePermission('Clients', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const { Name } = req.body as CreateClientDTO;

    if (!Name || typeof Name !== 'string') return res.status(400).json({ error: 'Name is required' });

    const client = await createClient(Name.trim());

    await auditOrchestrator.log({
      entityName: 'cli_clients',
      entityId: String(client.Id),
      createdBy,
      oldValues: null,
      newValues: client,
      comment: `Client "${client.Name}" created`,
    });

    res.status(201).json(client);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /clients/:id
router.put('/:id', requirePermission('Clients', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updatedBy = req.user?.email ?? 'unknown';
    const { Name } = req.body as UpdateClientDTO;

    if (!Name || typeof Name !== 'string') return res.status(400).json({ error: 'Name is required' });

    const before = await getClientById(id);
    if (!before) return res.status(404).json({ error: 'Client not found' });

    const client = await updateClient(id, Name.trim());

    await auditOrchestrator.log({
      entityName: 'cli_clients',
      entityId: String(id),
      createdBy: updatedBy,
      oldValues: before,
      newValues: client,
      comment: `Client "${client?.Name}" updated`,
    });

    res.json(client);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /clients/:id
router.delete('/:id', requirePermission('Clients', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getClientById(id);
    if (!before) return res.status(404).json({ error: 'Client not found' });

    await deleteClient(id);

    await auditOrchestrator.log({
      entityName: 'cli_clients',
      entityId: String(id),
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Client "${before.Name}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
