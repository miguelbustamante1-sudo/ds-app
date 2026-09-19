import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { TEAM_MEMBER_CHANGE_AUTH_TEMPLATE_CODE } from './TeamMemberChangeAuthConstants';

export interface InstantiateTeamMemberChangeAuthWorkflowInput {
  teamMemberId: number;
  ownerUserId: number;
  startedByEmail: string;
  sourceAuditId: string;
}

/**
 * Starts the Team Member Change Authorization workflow via its DATABASE-type
 * instantiate procedure. Called from updateTeamMember.ts right after the
 * change has been applied and audited by TypeScript — this does not perform
 * the domain mutation itself (unlike a fully DB-native trigger path), only
 * the instance/task creation, since TS is already present in this call chain.
 *
 * Best-effort by design: updateTeamMember() must keep working exactly as it
 * does today when this workflow doesn't exist or isn't published yet (no
 * template row — the common case until the DB team applies the handoff
 * script and the template is authored/published), and must not turn a
 * successful, already-audited team member update into a failed request just
 * because this side effect couldn't start (e.g. the procedure isn't deployed
 * yet). Any failure here is logged, never thrown.
 *
 * The procedure name is read from the template's own instantiateProcName
 * column, not hardcoded here — that's the point of DATABASE execution type:
 * the template authored in /admin/workflow/templates is the source of truth,
 * so repointing it to a different procedure is a template edit, not a code
 * change. TEAM_MEMBER_CHANGE_AUTH_TEMPLATE_CODE is the only value this file
 * still hardcodes, since something has to know which template to look up.
 */
export async function instantiateTeamMemberChangeAuthWorkflow(
  input: InstantiateTeamMemberChangeAuthWorkflowInput,
): Promise<boolean> {
  const template = await prisma.wflWorkflowTemplate.findFirst({
    where: { code: TEAM_MEMBER_CHANGE_AUTH_TEMPLATE_CODE, status: 'PUBLISHED' },
    select: { wflId: true, instantiateProcName: true },
  });

  if (!template?.instantiateProcName) {
    return false;
  }

  try {
    await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM ${Prisma.raw(`ds."${template.instantiateProcName}"`)}(
        ${template.wflId}::uuid,
        ${input.teamMemberId},
        ${input.ownerUserId},
        ${input.startedByEmail},
        ${String(input.ownerUserId)},
        ${input.sourceAuditId}::uuid
      )`,
    );
    return true;
  } catch (err) {
    console.error(
      `instantiateTeamMemberChangeAuthWorkflow: failed to start workflow for teamMemberId=${input.teamMemberId}`,
      err,
    );
    return false;
  }
}
