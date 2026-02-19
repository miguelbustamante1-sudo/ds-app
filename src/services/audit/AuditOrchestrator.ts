import { createAudit } from './repository';
import type { CreateAuditInput } from './repository';

export class AuditOrchestrator {
  /**
   * Log an audit record for any entity mutation.
   *
   * @param entityName  - The DB table name that was affected (e.g. "cat_categories")
   * @param entityId    - The ID of the affected record (as string to support any PK type)
   * @param createdBy   - Email or identifier of the user who made the change
   * @param oldValues   - Snapshot of the record before the change (null for inserts)
   * @param newValues   - Snapshot of the record after the change (null for deletes)
   * @param comment     - Optional human-readable note about the change
   */
  async log(input: CreateAuditInput) {
    return createAudit(input);
  }
}

export const auditOrchestrator = new AuditOrchestrator();
