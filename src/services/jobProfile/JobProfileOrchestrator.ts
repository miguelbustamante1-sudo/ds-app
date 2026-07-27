import type { SkillDTO, GroupDTO, DerivedJobProfileDTO } from '@shared/dto';
import { getAllSkills, getAllGroups, findJobProfileMapping } from './repository';

export class JobProfileOrchestrator {
  async getSkills(): Promise<SkillDTO[]> {
    return getAllSkills();
  }

  async getGroups(): Promise<GroupDTO[]> {
    return getAllGroups();
  }

  /**
   * Returns null fields when no mapping row exists yet (José loads rows separately, TASK-001) —
   * this must never throw, so the endorsement form can render gracefully before the mapping is loaded.
   */
  async deriveJobProfile(
    posId: number,
    tibId: number,
    sklId: number,
    grpId: number,
  ): Promise<DerivedJobProfileDTO> {
    return findJobProfileMapping(posId, tibId, sklId, grpId);
  }
}

export const jobProfileOrchestrator = new JobProfileOrchestrator();
