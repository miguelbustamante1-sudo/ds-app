/**
 * DTOs for User entity (domain users for audit trails)
 */

/**
 * UserDTO - Full user data returned to client
 */
export interface UserDTO {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  userStartDate: Date;
  userEndDate: Date | null;
  teamMemberId: number | null;
}

/**
 * CreateUserDTO - Data required to create a new user
 */
export interface CreateUserDTO {
  userName: string;
  userEmail: string;
  userRole: string;
  userStartDate: Date | string;
  userEndDate?: Date | string | null;
  teamMemberId?: number | null;
}

/**
 * UpdateUserDTO - Data allowed to be updated
 */
export interface UpdateUserDTO {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userStartDate?: Date | string;
  userEndDate?: Date | string | null;
  teamMemberId?: number | null;
}
