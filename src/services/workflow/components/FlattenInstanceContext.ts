import { WicWorkflowInstanceContext } from '@prisma/client';

/**
 * Flattens the generic wic_workflow_instance_context typed-column rows
 * (valueText/valueNumber/valueBoolean/valueDate/valueDatetime/valueJson) into
 * a plain { key: value } map. Purely mechanical and domain-agnostic — this
 * has no idea what any given key means (e.g. 'sourceAuditId', 'changedFields'
 * are both just keys as far as this is concerned). Domain-specific procedures
 * decide what to write under which key; domain-specific frontend code decides
 * what to render for a key it recognizes.
 */
export function flattenInstanceContext(
  rows: WicWorkflowInstanceContext[],
): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  for (const row of rows) {
    if (row.valueJson !== null) context[row.key] = row.valueJson;
    else if (row.valueText !== null) context[row.key] = row.valueText;
    else if (row.valueNumber !== null) context[row.key] = row.valueNumber;
    else if (row.valueBoolean !== null) context[row.key] = row.valueBoolean;
    else if (row.valueDatetime !== null) context[row.key] = row.valueDatetime;
    else if (row.valueDate !== null) context[row.key] = row.valueDate;
    else context[row.key] = null;
  }
  return context;
}
