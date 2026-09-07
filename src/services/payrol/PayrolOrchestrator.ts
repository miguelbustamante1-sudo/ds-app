import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { CreatePayrolDTO, UpdatePayrolDTO, PayrolDTO } from '../../../shared/dto/Payrol';
import { listPayrols, findPayrolById, toDTO } from './components/payrolQueries';
import { createPayrol, updatePayrol, closePayrol, dropPayrol } from './components/payrolMutations';


class PayrolOrchestrator {
  async list(): Promise<PayrolDTO[]> {
    return listPayrols();
  }

  async getById(prlId: number): Promise<PayrolDTO | null> {
    return findPayrolById(prlId);
  }

  async create(dto: CreatePayrolDTO, createdBy: number, userEmail: string): Promise<PayrolDTO> {
    const created = await createPayrol(dto, createdBy);
    await auditOrchestrator.log({
      entityName: 'prl_payrol',
      entityId: String(created.prlId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Payrol period created: ${created.prlDescription}`,
    });
    return toDTO(created);
  }

  async update(prlId: number, dto: UpdatePayrolDTO, updatedBy: number, userEmail: string): Promise<PayrolDTO> {
    const { before, after } = await updatePayrol(prlId, dto, updatedBy);
    await auditOrchestrator.log({
      entityName: 'prl_payrol',
      entityId: String(prlId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Payrol period updated: ${after.prlDescription}`,
    });
    return toDTO(after);
  }

  async close(prlId: number, updatedBy: number, userEmail: string): Promise<PayrolDTO> {
    const { before, after } = await closePayrol(prlId, updatedBy);
    await auditOrchestrator.log({
      entityName: 'prl_payrol',
      entityId: String(prlId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Payrol period closed: ${after.prlDescription}`,
    });
    return toDTO(after);
  }

  async drop(prlId: number, updatedBy: number, userEmail: string): Promise<void> {
    const { before } = await dropPayrol(prlId, updatedBy);
    await auditOrchestrator.log({
      entityName: 'prl_payrol',
      entityId: String(prlId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Payrol period dropped: ${before.prlDescription}`,
    });
  }
}

export const payrolOrchestrator = new PayrolOrchestrator();
