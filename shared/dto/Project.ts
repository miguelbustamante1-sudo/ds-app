/**
 * DTOs for Project entity
 */

/**
 * ProjectDTO - Full project data returned to client
 */
export interface ProjectDTO {
  projectId: number;
  projectName: string | null;
  projectExternalId: string | null;
  projectSow: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  projectActive: boolean | null;
  projectCreatedAt: string | null;
  projectCreatedBy: string | null;
  clientId: number | null;
  clientName: string | null;
}

/**
 * CreateProjectDTO - Data required to create a new project
 */
export interface CreateProjectDTO {
  projectName: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  projectActive?: boolean | null;
  clientId?: number | null;
}

/**
 * UpdateProjectDTO - Data allowed to be updated
 */
export interface UpdateProjectDTO {
  projectName?: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  projectActive?: boolean | null;
  clientId?: number | null;
}
