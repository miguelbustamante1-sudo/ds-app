/**
 * DTOs for Bonus Category
 * Maps to ds.bca_bonus_categories
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
