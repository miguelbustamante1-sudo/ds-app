export interface SopLibraryItemDto {
  sliId: number;
  sliName: string;
  sliGoogleUrl: string;
  sliCategory: string | null;
  sliMinTier: number;
  sliActive: boolean;
  sliCreatedBy: number;
  sliCreatedDate: Date;
  sliUpdatedBy: number;
  sliUpdatedDate: Date;
}

export interface CreateSopLibraryItemInput {
  sliName: string;
  sliGoogleUrl: string;
  sliCategory?: string | null;
  sliMinTier: number;
}

export interface UpdateSopLibraryItemInput {
  sliName?: string;
  sliGoogleUrl?: string;
  sliCategory?: string | null;
  sliMinTier?: number;
  sliActive?: boolean;
}
