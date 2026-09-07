export interface PayrolDTO {
  prlId: number;
  prlDescription: string;
  prlStartDate: string;
  prlEndDate: string;
  prlMonth: number;
  prlYear: number;
  prlFrequency: number | null;
  prlStatus: 'Open' | 'Closed';
  prlCreatedAt: string;
}

export interface CreatePayrolDTO {
  prlDescription: string;
  prlStartDate: string;
  prlEndDate: string;
  prlMonth: number;
  prlYear: number;
  prlFrequency?: number | null;
}

export interface UpdatePayrolDTO {
  prlDescription?: string;
  prlStartDate?: string;
  prlEndDate?: string;
  prlMonth?: number;
  prlYear?: number;
  prlFrequency?: number | null;
}
