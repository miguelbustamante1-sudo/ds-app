/**
 * DTOs for per-project ownership/view grants (FR-012, FR-013).
 * A project is modifiable by its PM (Project.projectManagerId) or anyone
 * holding an 'owner' grant here. 'view' grants are informational only —
 * reads are not restricted by this table (DEC-004).
 */

export type ProjectGrantAccess = 'owner' | 'view';

export interface ProjectGrantDTO {
  projectGrantId: number;
  projectId: number;
  teamMemberId: number;
  teamMemberName: string;
  access: ProjectGrantAccess;
  createdAt: Date | string;
}

export interface CreateProjectGrantDTO {
  projectId: number;
  teamMemberId: number;
  access: ProjectGrantAccess;
}

export interface CanModifyProjectDTO {
  canModify: boolean;
}
