import { getTeamMemberById, deleteTeamMember as dbDelete } from '../../../db/teamMembers';
import { auditOrchestrator } from '../../audit';
import { TeamMemberNotFoundError } from './errors';

export async function deleteTeamMember(id: number, email: string): Promise<void> {
  const before = await getTeamMemberById(id);
  if (!before) throw new TeamMemberNotFoundError('Team member not found');

  await dbDelete(id);

  await auditOrchestrator.log({
    entityName: 'tbl_team_members',
    entityId:   String(id),
    createdBy:  email,
    oldValues:  before,
    newValues:  null,
    comment:    `Team member ${before.teamMemberNames} ${before.teamMemberSurnames} deleted`,
  });
}
