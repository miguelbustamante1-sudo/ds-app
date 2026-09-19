import { prisma } from '../../../db/prisma';
import {
  WorkflowExecutionTypeProcNameRequiredError,
  WorkflowExecutionTypeMixingError,
  WorkflowExecutionTypeProcNotFoundError,
  WorkflowExecutionTypeAssignmentTypeError,
  WorkflowExecutionTypeJoinsNotAllowedError,
} from '../errors';

/**
 * Called at publish time, alongside validateRoutingExpressions. Enforces
 * spec §6's 5 rules for DATABASE execution type. Throws on the first
 * violation found; a passing template has nothing further to check here.
 */
export async function validateExecutionType(wflId: string): Promise<void> {
  const template = await prisma.wflWorkflowTemplate.findUniqueOrThrow({
    where: { wflId },
    select: {
      executionType: true,
      instantiateProcName: true,
      tasks: {
        where: { isActive: true },
        select: {
          code: true,
          assignmentType: true,
          outcomes: { select: { code: true, executionType: true, outcomeProcName: true } },
        },
      },
    },
  });

  // Rule 1: required proc name — template level.
  if (template.executionType === 'DATABASE' && !template.instantiateProcName) {
    throw new WorkflowExecutionTypeProcNameRequiredError(
      'Template is DATABASE execution type but has no instantiateProcName set',
    );
  }

  // Rule 1: required proc name — per outcome.
  for (const task of template.tasks) {
    for (const outcome of task.outcomes) {
      if (outcome.executionType === 'DATABASE' && !outcome.outcomeProcName) {
        throw new WorkflowExecutionTypeProcNameRequiredError(
          `Outcome '${outcome.code}' on task '${task.code}' is DATABASE execution type but has no outcomeProcName set`,
        );
      }
    }
  }

  // Rule 2: asymmetric mixing rule — a DATABASE template cannot contain a CODE outcome.
  if (template.executionType === 'DATABASE') {
    for (const task of template.tasks) {
      for (const outcome of task.outcomes) {
        if (outcome.executionType !== 'DATABASE') {
          throw new WorkflowExecutionTypeMixingError(
            `Template is DATABASE execution type but outcome '${outcome.code}' on task '${task.code}' is CODE`,
          );
        }
      }
    }
  }

  // Rule 3: procedure existence check — every configured DATABASE proc name
  // must resolve to a real, already-deployed function.
  const procNames = new Set<string>();
  if (template.executionType === 'DATABASE' && template.instantiateProcName) {
    procNames.add(template.instantiateProcName);
  }
  for (const task of template.tasks) {
    for (const outcome of task.outcomes) {
      if (outcome.executionType === 'DATABASE' && outcome.outcomeProcName) {
        procNames.add(outcome.outcomeProcName);
      }
    }
  }
  for (const procName of procNames) {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = ${procName}) AS exists
    `;
    if (!rows[0]?.exists) {
      throw new WorkflowExecutionTypeProcNotFoundError(`Procedure '${procName}' does not exist in the database`);
    }
  }

  // Rule 4: CONTEXT is mandatory on DATABASE templates, forbidden on CODE templates.
  for (const task of template.tasks) {
    if (template.executionType === 'DATABASE' && task.assignmentType !== 'CONTEXT') {
      throw new WorkflowExecutionTypeAssignmentTypeError(
        `Template is DATABASE execution type but task '${task.code}' has assignmentType '${task.assignmentType}', not CONTEXT`,
      );
    }
    if (template.executionType === 'CODE' && task.assignmentType === 'CONTEXT') {
      throw new WorkflowExecutionTypeAssignmentTypeError(
        `Task '${task.code}' has assignmentType CONTEXT but the template is CODE execution type`,
      );
    }
  }

  // Rule 5: no joins on DATABASE-type templates.
  if (template.executionType === 'DATABASE') {
    const dependencyCount = await prisma.wtdWorkflowTemplateDependency.count({ where: { wflId } });
    if (dependencyCount > 0) {
      throw new WorkflowExecutionTypeJoinsNotAllowedError(
        'Template is DATABASE execution type but has task dependency rows configured (joins are not supported)',
      );
    }
  }
}
