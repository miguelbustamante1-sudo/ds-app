/**
 * DTOs for Client entity
 */

/**
 * ClientDTO - Full client data returned to client
 */
export interface ClientDTO {
  Id: number;
  Name: string;
}

/**
 * CreateClientDTO - Data required to create a new client
 */
export interface CreateClientDTO {
  Name: string;
}

/**
 * UpdateClientDTO - Data allowed to be updated
 */
export interface UpdateClientDTO {
  Name?: string;
}
