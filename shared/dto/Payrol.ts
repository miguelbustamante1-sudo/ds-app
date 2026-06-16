export interface PayrolDTO {
  prlId: number;
  prlDescription: string;
  prlStartDate: string;
  prlEndDate: string;
  prlStatus: 'Open' | 'Closed';
  prlCreatedAt: string;
}

export interface CreatePayrolDTO {
  prlDescription: string;
  prlStartDate: string;
  prlEndDate: string;
}

export interface UpdatePayrolDTO {
  prlDescription?: string;
  prlStartDate?: string;
  prlEndDate?: string;
}
