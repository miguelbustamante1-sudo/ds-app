/**
 * DTOs for Skill, Group, and JobProfile catalogs (endorsement job-profile derivation)
 */

/**
 * SkillDTO - Full skill data returned to client
 */
export interface SkillDTO {
  skillId: number;
  skillName: string;
}

/**
 * GroupDTO - Full group data returned to client
 */
export interface GroupDTO {
  groupId: number;
  groupName: string;
}

/**
 * JobProfileDTO - Full job profile data returned to client
 */
export interface JobProfileDTO {
  jobProfileId: number;
  jobProfileName: string;
  jobProfileCode: string | null;
}

/**
 * DerivedJobProfileDTO - Result of deriving a job profile from position, tier/band, skill, and group.
 * All fields are null when no mapping row exists yet for the given combination.
 */
export interface DerivedJobProfileDTO {
  jobProfileId: number | null;
  jobProfileName: string | null;
  jobProfileCode: string | null;
}

/**
 * TechnologyDTO - Full technology data returned to client
 */
export interface TechnologyDTO {
  technologyId: number;
  technologyName: string;
}

/**
 * DerivedGroupDTO - Result of deriving a Group from position (+ technology).
 * Both fields are null when no mapping row exists yet for the given combination.
 */
export interface DerivedGroupDTO {
  groupId: number | null;
  groupName: string | null;
}
