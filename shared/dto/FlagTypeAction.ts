export interface FlagTypeActionDTO {
  flagTypeActionId: number;
  category: string;
  actionLabel: string;
  actionUrl: string;
  createdBy: number;
  createdDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
}

/**
 * Excludes: flagTypeActionId (auto), audit fields (server-populated)
 */
export interface CreateFlagTypeActionDTO {
  category: string;
  actionLabel: string;
  actionUrl: string;
}

export interface UpdateFlagTypeActionDTO {
  category?: string;
  actionLabel?: string;
  actionUrl?: string;
}
