/**
 * DTOs for Endorsement entity
 */

/**
 * EndorsementDTO - Full endorsement data returned to client
 */
export interface EndorsementDTO {
  endorsementId: number;
  candidateFirstName: string;
  candidateLastName: string;
  candidatePosition: string;
  projectId: number;
  clientManagerEmail: string;
  tibId: number | null;
  billingRate: number | null;
  countryId: number;
  startDate: Date | string;
  status: string;
  createdBy: string;
  createdAt: Date | string | null;
  updatedBy: string | null;
  updatedAt: Date | string | null;
  comment: string | null;
}

/**
 * EndorsementBonusWithCategoryDTO - Bonus entry with its subcategory and category resolved
 */
export interface EndorsementBonusWithCategoryDTO {
  endorsementBonusId: number;
  bonusSubcategoryId: number | null;
  endorsementBonusAmount: number | null;
  bonusSubcategory: {
    bonusSubcategoryName: string;
    bonusCategory: {
      bonusCategoryId: number;
      bonusCategoryName: string;
    };
  } | null;
}

/**
 * EndorsementWithDetailsDTO - Enriched DTO with project and country names
 */
export interface EndorsementWithDetailsDTO extends EndorsementDTO {
  project: {
    projectName: string | null;
  };
  country: {
    countryName: string;
    countryCurrencySymbol: string | null;
  };
  tierBand: {
    tierBandId: number;
    tierBandDescription: string;
  } | null;
  endorsementBonuses?: EndorsementBonusWithCategoryDTO[];
}

/**
 * CreateEndorsementDTO - Data required to create a new endorsement
 */
export interface CreateEndorsementDTO {
  candidateFirstName: string;
  candidateLastName: string;
  candidatePosition: string;
  projectId: number;
  clientManagerEmail: string;
  tibId?: number | null;
  billingRate?: number | null;
  countryId: number;
  startDate: string;
  comment?: string | null;
}

/**
 * CreateEndorsementBonusInput - Bonus data sent alongside endorsement creation
 */
export interface CreateEndorsementBonusInput {
  bonusSubcategoryId: number;
  endorsementBonusAmount: number | null;
  endorsementBonusComments?: string;
  endorsementBonusMetadata: Record<string, unknown>;
}

/**
 * CreateEndorsementWithBonusesDTO - Endorsement creation payload with bonuses
 */
export interface CreateEndorsementWithBonusesDTO extends CreateEndorsementDTO {
  bonuses: CreateEndorsementBonusInput[];
}

/**
 * UpdateEndorsementDTO - Data for updating an endorsement
 */
export interface UpdateEndorsementDTO {
  candidateFirstName?: string;
  candidateLastName?: string;
  candidatePosition?: string;
  projectId?: number;
  clientManagerEmail?: string;
  tibId?: number | null;
  billingRate?: number | null;
  countryId?: number;
  startDate?: string;
  comment?: string | null;
}

/**
 * UpdateEndorsementStatusDTO - Data for updating endorsement status
 */
export interface UpdateEndorsementStatusDTO {
  status: string;
  comment?: string | null;
}

/**
 * EndorsementBonusDTO - Full endorsement bonus data
 */
export interface EndorsementBonusDTO {
  endorsementBonusId: number;
  endorsementId: number;
  bonusSubcategoryId: number | null;
  endorsementBonusAmount: number | null;
  endorsementBonusMetadata: unknown;
  endorsementBonusComments: string | null;
  endorsementBonusCreatedAt: Date | string | null;
  endorsementBonusCreatedBy: string | null;
}

/**
 * CreateEndorsementBonusDTO - Data for creating an endorsement bonus
 */
export interface CreateEndorsementBonusDTO {
  endorsementId: number;
  bonusSubcategoryId?: number | null;
  endorsementBonusAmount?: number | null;
  endorsementBonusMetadata?: unknown;
  endorsementBonusComments?: string | null;
}

/**
 * UpdateEndorsementBonusDTO - Data for updating an endorsement bonus
 */
export interface UpdateEndorsementBonusDTO {
  bonusSubcategoryId?: number | null;
  endorsementBonusAmount?: number | null;
  endorsementBonusMetadata?: unknown;
  endorsementBonusComments?: string | null;
}

/**
 * BonusCategoryDTO - Full bonus category data
 */
export interface BonusCategoryDTO {
  bonusCategoryId: number;
  bonusCategoryName: string;
}

/**
 * CreateBonusCategoryDTO - Data required to create a new bonus category
 */
export interface CreateBonusCategoryDTO {
  bonusCategoryName: string;
}

/**
 * UpdateBonusCategoryDTO - Data allowed to be updated
 */
export interface UpdateBonusCategoryDTO {
  bonusCategoryName?: string;
}

/**
 * BonusSubcategoryDTO - Full bonus subcategory data
 */
export interface BonusSubcategoryDTO {
  bonusSubcategoryId: number;
  bonusCategoryId: number;
  bonusSubcategoryName: string;
  countryId: number;
  bonusSubcategoryMetadata: Record<string, string>;
  bonusSubcategoryDefaultAmount: number | null;
  bonusCategory?: { bonusCategoryName: string };
  country?: { countryName: string };
}

/**
 * CreateBonusSubcategoryDTO - Data required to create a new bonus subcategory
 */
export interface CreateBonusSubcategoryDTO {
  bonusCategoryId: number;
  countryId: number;
  bonusSubcategoryName: string;
  bonusSubcategoryMetadata: Record<string, string>;
  bonusSubcategoryDefaultAmount?: number | null;
}

/**
 * UpdateBonusSubcategoryDTO - Data for updating a bonus subcategory
 */
export interface UpdateBonusSubcategoryDTO {
  bonusCategoryId?: number;
  countryId?: number;
  bonusSubcategoryName?: string;
  bonusSubcategoryMetadata?: Record<string, string>;
  bonusSubcategoryDefaultAmount?: number | null;
}
