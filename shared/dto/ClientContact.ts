/**
 * DTOs for ClientContact entity
 */

/**
 * ClientContactDTO - Full contact data returned to client
 */
export interface ClientContactDTO {
  id: number;
  clientId: number;
  name: string;
  email: string;
  phoneNumber: string;
  position: string | null;
  active: boolean;
  clientName?: string;
}

/**
 * CreateClientContactDTO - Data required to create a new contact
 */
export interface CreateClientContactDTO {
  clientId: number;
  name: string;
  email: string;
  phoneNumber: string;
  position?: string | null;
}

/**
 * UpdateClientContactDTO - Data allowed to be updated
 */
export interface UpdateClientContactDTO {
  name?: string;
  email?: string;
  phoneNumber?: string;
  position?: string | null;
  active?: boolean;
}
