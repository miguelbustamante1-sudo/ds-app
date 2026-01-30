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
}

/**
 * CreateProjectDTO - Data required to create a new project
 */
export interface CreateProjectDTO {
  projectName: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
}

/**
 * UpdateProjectDTO - Data allowed to be updated
 */
export interface UpdateProjectDTO {
  projectName?: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
}
