export interface PositionDTO {
  posId: number;
  posName: string;
  posDescription: string | null;
}

export interface CreatePositionDTO {
  posName: string;
  posDescription?: string | null;
}

export interface UpdatePositionDTO {
  posName?: string;
  posDescription?: string | null;
}
