import express from 'express';
import type { Response } from 'express';
import type { CreateClientContactDTO, UpdateClientContactDTO } from '@shared/dto';
import {
  getAllClientContacts,
  getClientContactById,
  getClientContactRaw,
  createClientContact,
  updateClientContact,
  deleteClientContact,
  TABLE,
} from '../db/clientContacts';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /client-contacts
router.get('/', requirePermission('Clients', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const contacts = await getAllClientContacts(clientId);
    res.json(contacts);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch client contacts' });
  }
});

// GET /client-contacts/:id
router.get('/:id', requirePermission('Clients', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const contact = await getClientContactById(id);
    if (!contact) return res.status(404).json({ error: 'Client contact not found' });

    res.json(contact);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch client contact' });
  }
});

// POST /client-contacts
router.post('/', requirePermission('Clients', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const { clientId, name, email, phoneNumber, position } = req.body as CreateClientContactDTO;

    if (!clientId || typeof clientId !== 'number') return res.status(400).json({ error: 'clientId is required' });
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email is required' });
    if (!phoneNumber || typeof phoneNumber !== 'string') return res.status(400).json({ error: 'phoneNumber is required' });

    const contact = await createClientContact({
      clientId,
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      position: position?.trim() ?? null,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(contact.id),
      createdBy,
      oldValues: null,
      newValues: contact,
      comment: `Client contact "${contact.name}" created`,
    });

    res.status(201).json(contact);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create client contact' });
  }
});

// PUT /client-contacts/:id
router.put('/:id', requirePermission('Clients', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updatedBy = req.user?.email ?? 'unknown';
    const { name, email, phoneNumber, position, active } = req.body as UpdateClientContactDTO;

    const before = await getClientContactRaw(id);
    if (!before) return res.status(404).json({ error: 'Client contact not found' });

    const contact = await updateClientContact(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email.trim() }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber.trim() }),
      ...(position !== undefined && { position: position?.trim() ?? null }),
      ...(active !== undefined && { active }),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: updatedBy,
      oldValues: before,
      newValues: contact,
      comment: `Client contact "${contact.name}" updated`,
    });

    res.json(contact);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update client contact' });
  }
});

// DELETE /client-contacts/:id
router.delete('/:id', requirePermission('Clients', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getClientContactRaw(id);
    if (!before) return res.status(404).json({ error: 'Client contact not found' });

    await deleteClientContact(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Client contact "${before.name}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete client contact' });
  }
});

export default router;
