import { getSwapsForSupervisor } from './getSwapsForSupervisor';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getSwapsForMaintenance(teamMemberId: number): Promise<HolidaySwapDTO[]> {
  // viewAll=true bypasses hierarchy check and uses getAllActiveTeamMembers()
  // supervisorTeamMemberId is ignored when viewAll=true
  return getSwapsForSupervisor(0, teamMemberId, true);
}
