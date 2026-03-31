export interface CreateBenchMoveDTO {
  teamMemberId: number;
  projectAssignmentUpdates: {
    projectAssignmentId: number;
    endDate: string; // ISO date
  }[];
  newSupervisorId: number;
  startDate: string; // ISO date
  functionalAreaId: number;
  allocation: number; // 0.01 – 1.00
}

export interface BenchMoveResultDTO {
  benchId: number;
  teamMemberId: number;
  updatedAssignments: number;
  supervisorUpdated: boolean;
  benchRecorded: boolean;
}

export interface BenchMoveDetailDTO {
  benchId: number;
  teamMemberId: number;
  teamMemberName: string;
  supervisorId: number | null;
  supervisorName: string | null;
  functionalAreaId: number;
  functionalAreaName: string;
  allocation: number;
  startDate: string;
  endDate: string | null;
  createdBy: string | null;
  createdAt: string | null;
  isActive: boolean;
}

export interface SupervisorChainDTO {
  level: 1 | 2 | 3;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
}

export interface EndBenchDTO {
  endDate: string; // ISO date
}
