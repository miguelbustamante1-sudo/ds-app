import type { TechnologyDTO, DerivedGroupDTO } from '@shared/dto';
import { getTechnologiesForPosition, findPositionGroup } from './repository';

export class PositionGroupOrchestrator {
  async getTechnologies(posId: number): Promise<TechnologyDTO[]> {
    return getTechnologiesForPosition(posId);
  }

  /**
   * Never throws — returns null fields when the combination isn't mapped yet, so the
   * endorsement form can fall back to the manual Group picker gracefully.
   */
  async deriveGroup(posId: number, tecId: number | null): Promise<DerivedGroupDTO> {
    return findPositionGroup(posId, tecId);
  }
}

export const positionGroupOrchestrator = new PositionGroupOrchestrator();
