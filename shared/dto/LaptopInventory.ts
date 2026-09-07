export interface LaptopAssignmentDTO {
  assignmentId: number;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  startDate: Date;
  notes: string | null;
}

export interface LaptopDTO {
  laptopId: number;
  serialNumber: string;
  assetNumber: string | null;
  model: string | null;
  brand: string | null;
  code: string | null;
  ramGb: string | null;
  storageGb: string | null;
  region: string | null;
  purchaseDate: Date | null;
  po: string | null;
  usable: boolean;
  category: string | null;
  site: string | null;
  status: string;
  comments: string | null;
  deviceName: string | null;
  osVersion: string | null;
  blueprintName: string | null;
  tags: string[];
  lastCheckIn: Date | null;
  createdDate: Date;
  updatedDate: Date | null;
  activeAssignment: LaptopAssignmentDTO | null;
}

export interface CreateLaptopDTO {
  serialNumber: string;
  assetNumber?: string | null;
  model?: string | null;
  brand?: string | null;
  code?: string | null;
  ramGb?: string | null;
  storageGb?: string | null;
  region?: string | null;
  purchaseDate?: string | null; // "YYYY-MM-DD"
  po?: string | null;
  usable?: boolean;
  category?: string | null;
  site?: string | null;
  status?: string;
  comments?: string | null;
  deviceName?: string | null;
  osVersion?: string | null;
  blueprintName?: string | null;
  tags?: string[];
  lastCheckIn?: string | null; // ISO datetime
  // optional; if provided, creates an active assignment row
  teamMemberId?: number | null;
  assignmentNotes?: string | null;
}

export interface UpdateLaptopDTO {
  assetNumber?: string | null;
  model?: string | null;
  brand?: string | null;
  code?: string | null;
  ramGb?: string | null;
  storageGb?: string | null;
  region?: string | null;
  purchaseDate?: string | null; // "YYYY-MM-DD"
  po?: string | null;
  usable?: boolean;
  category?: string | null;
  site?: string | null;
  status?: string;
  comments?: string | null;
  deviceName?: string | null;
  osVersion?: string | null;
  blueprintName?: string | null;
  tags?: string[];
  lastCheckIn?: string | null; // ISO datetime
  // if teamMemberId is provided, rotates the assignment
  teamMemberId?: number | null;
  assignmentNotes?: string | null;
}
